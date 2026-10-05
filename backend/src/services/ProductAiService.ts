import fs from 'fs';
import dns from 'dns/promises';
import path from 'path';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import mongoose from 'mongoose';
import { AIClient } from './ai/aiClient';
import { AiPromptContextBuilder } from './AiPromptContextBuilder';
import { NormalizationEngine } from './NormalizationEngine';
export class ProductAiService {
  /**
   * AI Autofill Product - Extract object, materials, and generate customer-friendly details
   */
  static async analyzeProductImage(
    title: string | undefined,
    imageSrc: string | undefined,
    categoryList: any,
    providerId?: string,
  ) {
    if (!title && !imageSrc) {
      throw new ApiError(400, 'Please provide a title or image URL for analysis.');
    }

    let base64Image = '';
    let mimeType = 'image/jpeg';

    if (imageSrc) {
      try {
        if (imageSrc.startsWith('data:image/')) {
          const parts = imageSrc.split(';');
          mimeType = parts[0].split(':')[1];
          base64Image = parts[1].split(',')[1];
        } else if (imageSrc.startsWith('/')) {
          const absolutePath = path.resolve(process.cwd(), 'public', imageSrc.substring(1));
          if (fs.existsSync(absolutePath)) {
            const buffer = fs.readFileSync(absolutePath);
            base64Image = buffer.toString('base64');
            if (imageSrc.endsWith('.png')) mimeType = 'image/png';
            else if (imageSrc.endsWith('.webp')) mimeType = 'image/webp';
          }
        } else {
          // SSRF protection
          let parsedUrl: URL;
          try {
            parsedUrl = new URL(imageSrc);
          } catch {
            throw new ApiError(400, 'Invalid image URL format');
          }
          if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            throw new ApiError(400, 'Only HTTP/HTTPS image URLs are allowed');
          }

          let address = '';
          try {
            const lookupResult = await dns.lookup(parsedUrl.hostname);
            address = lookupResult.address;
          } catch {
            throw new ApiError(400, 'Invalid or unresolvable hostname');
          }

          let checkIp = address;
          if (checkIp.includes(':') && checkIp.toLowerCase().startsWith('::ffff:')) {
            checkIp = checkIp.substring(7);
          }

          let isPrivate = false;
          if (checkIp === '::1' || checkIp.toLowerCase().startsWith('fe80:')) {
            isPrivate = true;
          } else {
            const parts = checkIp.split('.');
            if (parts.length === 4) {
              const [p1, p2] = [parseInt(parts[0], 10), parseInt(parts[1], 10)];
              if (
                p1 === 10 ||
                p1 === 127 ||
                p1 === 0 ||
                (p1 === 169 && p2 === 254) ||
                (p1 === 172 && p2 >= 16 && p2 <= 31) ||
                (p1 === 192 && p2 === 168)
              ) {
                isPrivate = true;
              }
            }
          }

          if (isPrivate || parsedUrl.hostname.toLowerCase().endsWith('.internal')) {
            throw new ApiError(400, 'Internal network URLs are not allowed');
          }

          const safeUrl = parsedUrl.toString();
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);

          const response = await fetch(safeUrl, {
            signal: controller.signal,
          });
          clearTimeout(timeout);

          const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
          if (contentLength > 2 * 1024 * 1024) {
            throw new ApiError(400, 'Image too large for AI analysis (max 2MB)');
          }

          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          base64Image = buffer.toString('base64');

          const contentType = response.headers.get('content-type');
          if (contentType) mimeType = contentType;
        }
      } catch (err: unknown) {
        if (err instanceof ApiError) throw err;
        logger.error('Error fetching image for AI analysis:', err);
      }
    }

    const context = await AiPromptContextBuilder.buildContext(categoryList?.[0]);

    const prompt = `
      You are an expert catalog analyst for "Akula's Kitchen", a homemade food products store selling batters, chutneys, pickles, podis & masalas, namkeen and cashews.
      Your job is to analyze the uploaded product image carefully and extract ONLY accurate, clean, customer-friendly information.

      ${title ? `The admin has provided the title: "${title}"` : ''}

      Please perform a rigorous 7-stage analysis:
      STAGE 1 — OBJECT DETECTION: Identify the exact product (e.g. idli batter, dosa batter, coconut chutney, mango pickle, gongura pickle, sambar masala, podi, murukulu, cashews).
      STAGE 2 — INGREDIENT & PACKAGING DETECTION: Detect key visible ingredients and packaging (e.g. rice, urad dal, red chilli, mango, gongura, amla, curry leaves, ragi, glass jar, pouch, tub).
      STAGE 3 — USAGE CONTEXT DETECTION: Determine typical use cases (e.g. breakfast, lunch accompaniment, tea-time snack, festive gifting, everyday cooking).
      STAGE 4 — CUSTOMER-FRIENDLY TITLE GENERATION: Generate a clean, elegant, human-readable title.
      STAGE 5 — PERSONALIZATION ANALYSIS: Determine if this product supports customer personalization (names, messages, colors, themes). If yes, generate specific personalization instructions.
      STAGE 6 — CUSTOMER NOTE GENERATION: Generate professional, product-specific important notes for customers (storage tips, shelf life, spice level, serving suggestions).
      STAGE 7 — QUANTITY ESTIMATION: Using the image, title, description, and price, estimate the quantity of items visible (e.g. number of packs, jars, pouches). Use "approximately" when estimating.

      Available Store Categories: ${JSON.stringify(categoryList || [])}
      
      APPROVED ATTRIBUTE VALUES (use these whenever possible):
      Colors: ${JSON.stringify(context.allowedColors)}
      Materials: ${JSON.stringify(context.allowedMaterials)}
      Sizes: ${JSON.stringify(context.allowedSizes)}
      Existing Tags: ${JSON.stringify(context.existingTags.slice(0, 30))}
      
      CRITICAL: Use ONLY pre-approved values. Only suggest new values if nothing fits.
      If suggesting a new value, set its confidence below 70.

      CRITICAL RULES FOR CUSTOMER-FRIENDLY NAMING:
      1. THE ENGLISH TITLE MUST BE SHORT & CLEAN: Keep the "english_title" strictly within 2 to 5 words (e.g., "Idli Batter", "Mango Avakaaya", "Gongura Pickle", "Sambar Masala", "Ragi Murukulu", "Cashews W240").
      2. AVOID FLUFF & ROBOTIC DESCRIPTORS: Absolutely DO NOT use words like "Luxurious", "Ultra Elegant", "Premium", "Grand", "Ultimate", "Best", "Special" in the title. Keep it extremely simple and readable for normal people.
      3. NO KEYWORD STUFFING: Do not repeat terms or stack a long list of attributes. A bad example is "Premium Authentic Traditional Homemade Spicy Andhra Mango Avakaaya Pickle Jar". A good example is "Mango Avakaaya".
      4. CUSTOMER-FRIENDLY DESCRIPTION: Write a brief, simple, and elegant 2-sentence description. Use simple language that a normal customer instantly understands. Avoid robotic, overly technical, or repetitive jargon.
      5. CULINARY ACCURACY: Understand traditional South Indian (especially Andhra/Telugu) foods and generate accurate names for batters, pickles, podis, masalas and namkeen.
      6. CATEGORY MATCHING (MULTI-CATEGORY): STRICTLY prioritize selecting the 'primary_category' and 1 to 5 'secondary_categories' ONLY from the Provided Available Store Categories. DO NOT create new categories unless it is absolutely necessary because NO existing category is even remotely suitable. Avoid creating unnecessary duplicates (e.g., if "Pickles" exists, do not create "Pickle").
      7. Generate a clean Telugu translation in Telugu script (e.g., "మామిడి ఆవకాయ", "గోంగూర పచ్చడి").
      8. Generate a clean, simple, short SEO-friendly slug.
      9. Suggest an estimated, realistic price in INR (e.g., 999, 1500, 2500) based on the product type and pack size.
      10. Suggest 1 or 2 catchy storefront badges (e.g. "Bestseller", "Trending", "Limited Edition").
      11. CUSTOMIZATION DETECTION: Intelligently determine if this specific item is commonly personalized with text/names by customers (e.g. gift packs with a message). If yes, set "isCustomizable" to true and provide a "customizationNote" prompt for the customer (e.g., "Enter names to be printed").
      12. CONFIDENCE SCORES: Output an accurate "confidence" integer (between 1 and 100) representing your certainty about the detected object class. ALSO output "category_confidence" object mapping the primary/secondary categories to confidence percentages (1-100).
      13. TELUGU SEARCH ALIASES & KEYWORDS:
          - "telugu_keywords": Generate 3 to 5 transliterated Telugu search terms (written in English script) that local customers would use (e.g., ["avakaya", "mamidikaya pachadi"] for mango pickle; ["karam podi", "kandi podi"] for a podi).
          - "event_associations": String array mapping this product to specific events where it is used (e.g., ["Breakfast", "Festive", "Snack"]).
          - "search_aliases": Array of alternate names/synonyms users might search for in English or Hindi (e.g., ["aam ka achar", "mango pickle", "avakai"]).

      14. PERSONALIZATION CONFIG: Analyze the product type and generate context-aware personalization instructions.
          - "personalization_enabled": boolean — true ONLY if the product genuinely supports customization (e.g. gift packs with messages). Set false for regular food products.
          - "personalization_label": A short label for the personalization input (e.g. "Customization Details", "Gift Message").
          - "personalization_placeholder": A specific, multi-line placeholder with bullet-pointed instructions. Examples:
            For a Pickle Gift Pack: "• Mention preferred pickle varieties\n• Mention preferred spice level\n• Enter your gift message for the recipient"
            For a Cashew Gift Box: "• Mention preferred grade (W240, W320, W210)\n• Enter your gift message"
          - "personalization_helper": A short helper text for the admin (e.g. "Customers can customize this gift pack").

      15. CUSTOMER NOTE: Generate a professional, product-specific multi-line note that will be displayed on the storefront.
          - "customer_note": A multi-line string with bullet points using "• " prefix. This note should contain ONLY relevant, accurate information. Never generate generic placeholder text.
            Examples:
            For a Pickle (500 g): "• Made in small batches with traditional Andhra recipes\n• Always use a dry spoon\n• Store in a cool and dry place; refrigerate after opening"
            For a Batter (1 kg): "• Freshly ground; keep refrigerated\n• Best consumed within the shelf life printed on the pack"
            For Cashews: "• Packed hygienically to maintain freshness\n• Store in an airtight container"
            For a Rental Product: "• Rental duration and security deposit apply\n• Product must be returned in its original condition"

      16. QUANTITY ESTIMATION: Analyze the image, title, and price to estimate the number of individual items.
          - "estimated_quantity": An integer estimate of the number of items visible/included (e.g. number of packs or jars). Use the price and pack size as a guide.
          - "estimated_quantity_unit": The unit of measurement (e.g. "Packs", "Jars", "Pouches", "Pieces").
          - If you cannot determine the quantity, set estimated_quantity to 1 and estimated_quantity_unit to "Set".

      17. VARIANTS GENERATION (CRITICAL FOR FILTERING): You MUST suggest realistic product variations for 'Size' (e.g. 250g, 500g, 1 kg), 'Color', and 'Material' based on the image and product type.
          - "suggested_variants": An array of objects with "name" (Attribute like 'Size', 'Color', or 'Material'), "value" (Specific choice like 'Large', 'Red', or 'Wood'), and "price" (Price adjustment relative to base price, e.g. 0).
          - ALWAYS try to extract at least one 'Material', one 'Color', and one 'Size' variant so they can be used for storefront filtering. Even if there's only one option (e.g., Color: 'Gold'), include it as a variant with price 0.

      Please output a clean JSON object matching the following structure strictly (do not include any markdown block ticks, just raw JSON):
      {
        "detected_object": "Exact detected object class name",
        "confidence": 88,
        "english_title": "Short, clean 2-5 word title (e.g. Mango Avakaaya)",
        "telugu_title": "Natural Telugu translated title in Telugu script",
        "slug": "simple-url-slug",
        "primary_category": "Main Category Name",
        "secondary_categories": ["Related Category 1", "Related Category 2"],
        "category_confidence": {
          "Main Category Name": 98,
          "Related Category 1": 85
        },
        "materials": ["Material 1", "Material 2"],
        "colors": ["Color 1", "Color 2"],
        "style": "Style",
        "occasion": ["Occasion 1", "Occasion 2"],
        "tags": ["tag1", "tag2"],
        "badges": ["Bestseller", "Trending"],
        "price": 1500,
        "description": "Premium, clean 2-sentence description",
        "seo_keywords": ["keyword1", "keyword2"],
        "isCustomizable": true,
        "customizationNote": "Enter your gift message",
        "telugu_keywords": ["transliterated_telugu_1", "transliterated_telugu_2"],
        "event_associations": ["Breakfast", "Festive"],
        "search_aliases": ["alias1", "alias2"],
        "personalization_enabled": true,
        "personalization_label": "Customization Details",
        "personalization_placeholder": "• Specific instruction 1\n• Specific instruction 2\n• Specific instruction 3",
        "personalization_helper": "Customers can customize this gift pack",
        "customer_note": "• Product-specific note line 1\n• Product-specific note line 2\n• Product-specific note line 3",
        "estimated_quantity": 20,
        "estimated_quantity_unit": "Packs",
        "suggested_variants": [
          { "name": "Size", "value": "Standard", "price": 0 },
          { "name": "Size", "value": "Large", "price": 200 }
        ]
      }
    `;

    let textResponse: string;
    try {
      if (base64Image) {
        textResponse = await AIClient.generateVision('product-ai', base64Image, mimeType, prompt, {
          temperature: 0.2,
          maxTokens: 4000,
          jsonMode: true,
          providerOverride: providerId,
        });
      } else {
        textResponse = await AIClient.generateText('product-ai', prompt, {
          temperature: 0.2,
          maxTokens: 4000,
          jsonMode: true,
          providerOverride: providerId,
        });
      }
    } catch (err: any) {
      logger.error('AI API Error:', err.message);
      throw new ApiError(500, 'Failed to generate product details from AI API.');
    }

    try {
      const extractedJson = textResponse.match(/\{[\s\S]*\}/);
      if (!extractedJson) throw new Error('No JSON object found in response');

      let parsedData;
      try {
        // First try direct parse
        parsedData = JSON.parse(extractedJson[0]);
      } catch (_firstParseErr) {
        // Sanitize: fix unescaped newlines inside JSON string values
        // Replace actual newlines/tabs within strings with their escaped equivalents
        const sanitized = extractedJson[0]
          .replace(/\r\n/g, '\\n')
          .replace(/\r/g, '\\n')
          .replace(/\n/g, '\\n')
          .replace(/\t/g, '\\t');
        try {
          parsedData = JSON.parse(sanitized);
        } catch (secondParseErr) {
          try {
            const fs = require('fs');
            const path = require('path');
            const logPath = path.resolve(process.cwd(), 'logs/ai-debug.json');
            fs.mkdirSync(path.dirname(logPath), { recursive: true });
            fs.writeFileSync(logPath, textResponse);
          } catch (_) {}
          throw secondParseErr;
        }
      }

      // Ensure uniqueness against DB for title and slug across both Product and Showcase
      const ProductModel = mongoose.model('Product');
      const ShowcaseModel = mongoose.model('ShowcaseCollection');
      const baseSlug = parsedData.slug;
      const baseTitle = parsedData.english_title;

      let isUnique = false;
      let counter = 1;
      let currentSlug = baseSlug;
      let currentTitle = baseTitle;

      while (!isUnique) {
        // Check if either slug or title already exists in the database
        const existingProduct = await ProductModel.exists({
          $or: [{ slug: currentSlug }, { title: currentTitle }],
        });

        const existingShowcase = await ShowcaseModel.exists({ title: currentTitle });

        if (existingProduct || existingShowcase) {
          // If exists, append a counter to make it unique
          currentSlug = `${baseSlug}-${counter}`;
          currentTitle = `${baseTitle} ${counter}`;
          counter++;
        } else {
          isUnique = true;
        }
      }

      parsedData.slug = currentSlug;
      parsedData.english_title = currentTitle;

      // Pass AI output through NormalizationEngine
      parsedData.colors = await NormalizationEngine.normalizeValueList(
        'color',
        parsedData.colors || [],
      );
      parsedData.materials = await NormalizationEngine.normalizeValueList(
        'material',
        parsedData.materials || [],
      );
      parsedData.tags = (
        await NormalizationEngine.normalizeTags(parsedData.tags || [])
      ).displayTags;
      parsedData.suggested_variants = await NormalizationEngine.normalizeVariants(
        parsedData.suggested_variants || [],
      );

      return parsedData;
    } catch (err) {
      logger.error('Failed to parse Groq JSON:', textResponse, err);
      throw new ApiError(500, 'AI response could not be parsed as clean JSON.');
    }
  }

  /**
   * Refine AI Product result based on user prompt
   */
  static async refineAiProduct(previousResult: any, userPrompt: string, providerId?: string) {
    if (!previousResult || !userPrompt) {
      throw new ApiError(400, 'Please provide the previous AI result and a prompt.');
    }

    const prompt = `
      You are an expert catalog analyst for "Akula's Kitchen".
      You previously generated the following product curation data:
      ${JSON.stringify(previousResult, null, 2)}
      
      The user wants to make the following modification:
      "${userPrompt}"
      
      Please output an UPDATED clean JSON object matching the EXACT same structure as the previous data, incorporating the user's requested changes.
      Output ONLY the raw JSON object, without any markdown formatting or ticks.
    `;

    let textResponse: string;
    try {
      textResponse = await AIClient.generateText('product-ai-refine', prompt, {
        temperature: 0.2,
        maxTokens: 4000,
        jsonMode: true,
        providerOverride: providerId,
      });
    } catch (err: any) {
      logger.error('AI API Error:', err.message);
      throw new ApiError(500, 'Failed to refine product details from AI API.');
    }

    try {
      let cleanJson = textResponse.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      return JSON.parse(cleanJson);
    } catch {
      logger.error('Failed to parse Groq JSON:', textResponse);
      throw new ApiError(500, 'AI response could not be parsed as clean JSON.');
    }
  }
}
