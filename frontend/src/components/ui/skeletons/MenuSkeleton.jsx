const box = 'bg-[#f2f2f0] animate-pulse';

/** The menu's price list: section titles over dish rows with dotted leaders. */
export function MenuListSkeleton() {
  return (
    <div className="space-y-12" aria-busy="true" aria-label="Loading the menu">
      {[5, 4].map((rows, s) => (
        <div key={s}>
          <div className={`h-6 w-40 rounded-md mb-6 ${box}`} />
          <div className="space-y-4">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl shrink-0 ${box}`} />
                <div className="flex-1 flex items-end gap-3">
                  <div className={`h-4 w-1/3 rounded ${box}`} />
                  <div className="flex-1 border-b-2 border-dotted border-[#283618]/15" />
                  <div className={`h-4 w-12 rounded ${box}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Whole /menu page (header, desktop section sidebar, list) while its code loads. */
export function MenuPageSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 pt-4" aria-busy="true">
      <div className="mb-6 lg:mb-10 pt-2 sm:pt-4 pb-4 sm:pb-6 border-b border-[#283618]/12 flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className={`h-2.5 w-20 rounded ${box}`} />
          <div className={`h-9 sm:h-11 lg:h-12 w-48 sm:w-64 rounded-lg ${box}`} />
        </div>
        <div className={`h-14 w-32 sm:w-36 rounded-2xl ${box}`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        <div className="hidden lg:block lg:col-span-4 xl:col-span-3 space-y-2 p-5 rounded-2xl border border-[#283618]/10">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`h-9 rounded-full ${box}`} />
          ))}
        </div>
        <div className="lg:col-span-8 xl:col-span-9">
          <MenuListSkeleton />
        </div>
      </div>
    </div>
  );
}
