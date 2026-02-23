export default function OrdersPage() {
  return (
    <>
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-pink-50 via-white to-purple-50 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-pink-300 opacity-20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[420px] h-[420px] rounded-full bg-purple-300 opacity-20 blur-3xl" />
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <pattern id="dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="black" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>


      <div className="mx-auto max-w-4xl py-10 px-4 flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Previous Orders</h1>


        <div className="bg-white border shadow-sm rounded-xl p-6">
          <p className="text-gray-600 text-sm">You have no past orders yet.</p>
        </div>
      </div>
    </>
  );
}