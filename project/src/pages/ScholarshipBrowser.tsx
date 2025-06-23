{isLocked && (
  <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center z-10">
    <span className="text-[#05294E] font-bold text-lg mb-2">Unlock full details</span>
    <span className="text-slate-600 text-sm text-center mb-4">Pay the selection process fee to view all scholarship information and apply.</span>
    {/* Botão de pagamento */}
    {!isAuthenticated ? (
      <button
        className="bg-[#D0151C] text-white px-6 py-3 rounded-xl hover:bg-[#B01218] transition-all duration-300 font-bold mt-2"
        onClick={() => navigate('/login')}
      >
        Sign in to pay selection fee
      </button>
    ) : (
      <StripeCheckout
        productId="SELECTION_PROCESS"
        feeType="selection_process"
        paymentType="selection_process"
        buttonText="Pay Selection Fee to Unlock"
        className="mt-2"
        onSuccess={() => {}}
        onError={(err) => alert(err)}
      />
    )}
  </div>
)} 