// Componente SVG para o logo do PIX (oficial)
const PixIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <path fill="#4db6ac" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z"/>
    <path fill="#4db6ac" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z"/>
    <path fill="#4db6ac" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z"/>
  </svg>
);

// Componente SVG para o logo do Zelle (oficial)
const ZelleIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <path fill="#a0f" d="M35,42H13c-3.866,0-7-3.134-7-7V13c0-3.866,3.134-7,7-7h22c3.866,0,7,3.134,7,7v22C42,38.866,38.866,42,35,42z"/>
    <path fill="#fff" d="M17.5,18.5h14c0.552,0,1-0.448,1-1V15c0-0.552-0.448-1-1-1h-14c-0.552,0-1,0.448-1,1v2.5C16.5,18.052,16.948,18.5,17.5,18.5z"/>
    <path fill="#fff" d="M17,34.5h14.5c0.552,0,1-0.448,1-1V31c0-0.552-0.448-1-1-1H17c-0.552,0-1,0.448-1,1v2.5C16,34.052,16.448,34.5,17,34.5z"/>
    <path fill="#fff" d="M22.25,11v6c0,0.276,0.224,0.5,0.5,0.5h3.5c0.276,0,0.5-0.224,0.5-0.5v-6c0-0.276-0.224-0.5-0.5-0.5h-3.5C22.474,10.5,22.25,10.724,22.25,11z"/>
    <path fill="#fff" d="M22.25,32v6c0,0.276,0.224,0.5,0.5,0.5h3.5c0.276,0,0.5-0.224,0.5-0.5v-6c0-0.276-0.224-0.5-0.5-0.5h-3.5C22.474,31.5,22.25,31.724,22.25,32z"/>
    <path fill="#fff" d="M16.578,30.938H22l10.294-12.839c0.178-0.222,0.019-0.552-0.266-0.552H26.5L16.275,30.298C16.065,30.553,16.247,30.938,16.578,30.938z"/>
  </svg>
);

const StripeIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center bg-[#635bff] rounded-lg overflow-hidden shadow-sm shadow-[#635bff]/20`}>
    <span 
      className="text-white font-black text-[28px] leading-[0] select-none"
      style={{ 
        fontFamily: 'system-ui, -apple-system, sans-serif',
        transform: 'translateY(-1.5px)' // Puxando para cima para compensar o peso da fonte
      }}
    >
      S
    </span>
  </div>
);

const ParcelowIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center bg-white rounded-lg overflow-hidden p-0.5 border border-gray-100`}>
    <img
      src="/parcelow_share.webp"
      alt="Parcelow"
      className="w-full h-full object-contain scale-110"
    />
  </div>
);



          {activeTab === 'i20' && (
            <div className="w-full">
              {!(userProfile as any)?.has_paid_i20_control_fee ? (
                <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
                  
                  {/* Header Card */}
                  <div className="bg-slate-50 px-8 py-10 md:p-12 border-b border-slate-100">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-xl shadow-blue-500/20 transition-transform">
                          <Stamp className="w-10 h-10 text-white" />
                        </div>
                        <div className="text-center md:text-left">
                          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-2">Taxa de Controle <span className="text-blue-600">I-20</span></h2>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 md:p-16 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <Info className="w-4 h-4 text-blue-600" />
                          </div>
                          O que é esta taxa?
                        </h4>
                        <p className="text-gray-600 leading-relaxed font-medium">
                          {t('studentDashboard.applicationChatPage.i20ControlFee.description')}
                        </p>
                      </div>

                      <div className="space-y-8">
                         <div className={`border rounded-[2rem] p-8 relative overflow-hidden ${
                           i20Countdown === 'Expired' 
                             ? 'bg-red-50 border-red-200' 
                             : 'bg-amber-50 border-amber-200'
                         }`}>
                           <div className="flex items-start gap-4 relative z-10">
                              <div className="flex-1">
                                <h5 className={`font-black uppercase tracking-tight mb-2 ${i20Countdown === 'Expired' ? 'text-red-900' : 'text-amber-900'}`}>
                                  {i20Countdown === 'Expired' ? 'Prazo Expirado' : 'Atenção ao Prazo'}
                                </h5>
                                <p className={`text-sm font-medium leading-relaxed mb-4 ${i20Countdown === 'Expired' ? 'text-red-800' : 'text-amber-800'}`}>
                                  {i20Countdown === 'Expired' 
                                    ? 'O prazo para garantir o processamento prioritário da sua taxa I-20 expirou. Entre em contato com o suporte urgentemente.'
                                    : t('studentDashboard.applicationChatPage.i20ControlFee.deadlineInfo')}
                                </p>
                                
                                {scholarshipFeeDeadline && i20Countdown !== 'Expired' && (
                                  <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-amber-200/50 w-80 mx-auto">
                                    <p className="text-[10px] font-black text-amber-900/40 uppercase tracking-widest mb-2 text-center">Tempo Restante</p>
                                    <div className="flex items-center justify-center gap-4">
                                      {i20CountdownValues && (
                                        <>
                                          <div className="text-center">
                                            <p className="text-xl font-black text-amber-900 tracking-tighter">{i20CountdownValues.days}</p>
                                            <p className="text-[8px] font-black text-amber-900/40 uppercase">Dias</p>
                                          </div>
                                          <div className="w-px h-8 bg-amber-900/10" />
                                          <div className="text-center">
                                            <p className="text-xl font-black text-amber-900 tracking-tighter">{i20CountdownValues.hours}</p>
                                            <p className="text-[8px] font-black text-amber-900/40 uppercase">Hrs</p>
                                          </div>
                                          <div className="w-px h-8 bg-amber-900/10" />
                                          <div className="text-center">
                                            <p className="text-xl font-black text-amber-900 tracking-tighter">{i20CountdownValues.minutes}</p>
                                            <p className="text-[8px] font-black text-amber-900/40 uppercase">Min</p>
                                          </div>
                                          <div className="w-px h-8 bg-amber-900/10" />
                                          <div className="text-center">
                                            <p className="text-xl font-black text-amber-900 tracking-tighter">{i20CountdownValues.seconds}</p>
                                            <p className="text-[8px] font-black text-amber-900/40 uppercase">Seg</p>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                           </div>
                         </div>

                       </div>
                     </div>

                    {/* Integrated Payment Options - Expanded to full width */}
                    <div className="space-y-8 pt-6 pb-8 px-8 md:pt-8 md:pb-10 md:px-10 border-2 border-slate-200 rounded-[3rem] bg-slate-50/50 mt-12">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                          <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                            Escolha o Método de Pagamento
                          </h4>
                        </div>

                        <div className="bg-white px-8 py-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col items-center min-w-[200px]">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Total da Taxa</span>
                           <span className="text-4xl font-black text-grey-900 tracking-tighter leading-none">
                             {formatFeeAmount(promotionalCouponValidation?.finalAmount || getFeeAmount('i20_control_fee'))}
                           </span>
                         </div>
                      </div>

                      {/* Promotional Coupon Section */}
                      <div className="space-y-4 max-w-2xl w-full">
                        {!promotionalCouponValidation?.isValid && (
                          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100 max-w-md">
                            <label htmlFor="hasPromotionalCouponCheckbox" className="checkbox-container cursor-pointer flex-shrink-0">
                              <input
                                id="hasPromotionalCouponCheckbox"
                                name="hasPromotionalCouponCheckbox"
                                type="checkbox"
                                checked={hasPromotionalCouponCheckbox}
                                onChange={(e) => {
                                  setHasPromotionalCouponCheckbox(e.target.checked);
                                  if (!e.target.checked) {
                                    setPromotionalCoupon('');
                                    setPromotionalCouponValidation(null);
                                  }
                                }}
                                className="custom-checkbox"
                              />
                              <div className="checkmark" />
                            </label>
                            <label htmlFor="hasPromotionalCouponCheckbox" className="text-sm text-gray-700 font-medium leading-relaxed cursor-pointer select-none">
                              {t('preCheckoutModal.haveReferralCode') || 'Tenho um código de desconto'}
                            </label>
                          </div>
                        )}

                        {(hasPromotionalCouponCheckbox || promotionalCouponValidation?.isValid) && (
                          <div className="space-y-4 pt-4">
                            {!promotionalCouponValidation?.isValid && (
                              <div className="text-center">
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">
                                  Cupom Promocional
                                </h3>
                                <p className="text-sm text-gray-600">
                                  Tem um cupom promocional? Aplique aqui para economizar ainda mais na sua Taxa I-20!
                                </p>
                              </div>
                            )}

                            <div className="space-y-3">
                              {promotionalCouponValidation?.isValid ? (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 space-y-4 shadow-inner relative overflow-hidden">
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none" />
                                  
                                  <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
                                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                                      </div>
                                      <div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Cupom Aplicado</span>
                                        <span className="text-lg font-black text-gray-800 uppercase tracking-tight">{promotionalCoupon}</span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={removePromotionalCoupon}
                                      className="px-4 py-2 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg text-xs font-black uppercase tracking-widest transition-all border border-gray-100 hover:border-red-100"
                                    >
                                      Remover
                                    </button>
                                  </div>

                                  <div className="space-y-3 pt-4 border-t border-gray-100 relative z-10">
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
                                      <span>Preço Original:</span>
                                      <span className="line-through text-gray-300">
                                        ${getFeeAmount('i20_control_fee').toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
                                      <span>Desconto:</span>
                                      <span className="text-emerald-500">
                                        -${promotionalCouponValidation.discountAmount?.toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xl font-black uppercase tracking-tight pt-3 text-gray-900">
                                      <span>Total Final:</span>
                                      <span className="text-emerald-500">
                                        ${promotionalCouponValidation.finalAmount?.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="relative flex-1 group/input">
                                      <input
                                        id="promotionalCouponInput"
                                        name="promotionalCouponInput"
                                        ref={promotionalCouponInputRef}
                                        type="text"
                                        value={promotionalCoupon}
                                        onChange={(e) => {
                                          const newValue = e.target.value.toUpperCase();
                                          const cursorPosition = e.target.selectionStart;
                                          setPromotionalCoupon(newValue);
                                          requestAnimationFrame(() => {
                                            if (promotionalCouponInputRef.current) {
                                              promotionalCouponInputRef.current.setSelectionRange(cursorPosition, cursorPosition);
                                              promotionalCouponInputRef.current.focus();
                                            }
                                          });
                                        }}
                                        placeholder={t('preCheckoutModal.placeholder') || "Digite o código"}
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-center font-black text-gray-900 text-lg tracking-[0.2em] placeholder:text-gray-300"
                                        maxLength={20}
                                        autoComplete="off"
                                      />
                                      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-500" />
                                    </div>
                                    <button
                                      onClick={validatePromotionalCoupon}
                                      disabled={isValidatingPromotionalCoupon || !promotionalCoupon.trim()}
                                      className={`px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-xl active:scale-95 whitespace-nowrap sm:w-auto w-full ${
                                        isValidatingPromotionalCoupon || !promotionalCoupon.trim()
                                          ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                          : 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.2)]'
                                      }`}
                                    >
                                      {isValidatingPromotionalCoupon ? (
                                        <div className="flex items-center justify-center space-x-2">
                                          <Loader2 className="w-5 h-5 animate-spin" />
                                          <span>Validando...</span>
                                        </div>
                                      ) : (
                                        'Validar'
                                      )}
                                    </button>
                                  </div>
                                  
                                  {promotionalCouponValidation && !promotionalCouponValidation.isValid && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center space-x-3 backdrop-blur-md">
                                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                      <span className="text-sm text-red-400 font-medium">{promotionalCouponValidation.message}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-4">
                        {hasZellePendingI20 ? (
                          <div className="flex flex-col gap-0">
                            {/* Banner de aviso */}
                            <div className="bg-amber-50 border border-amber-200 rounded-t-[2rem] px-6 py-4 flex items-start gap-4">
                              <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center border border-amber-200 flex-shrink-0 mt-0.5">
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-amber-700 uppercase tracking-tight">Pagamento Zelle em Análise</p>
                                <p className="text-xs text-amber-600/80 font-medium mt-0.5 leading-relaxed">
                                  Você já iniciou um pagamento via Zelle. Aguarde a confirmação antes de usar outro método. Isso pode levar até 48 horas.
                                </p>
                              </div>
                            </div>

                            {/* ZelleCheckout inline — aberto automaticamente */}
                            <div className="border border-amber-200 border-t-0 rounded-b-[2rem] overflow-hidden bg-white shadow-sm">
                              <ZelleCheckout
                                feeType="i20_control_fee"
                                amount={promotionalCouponValidation?.finalAmount ?? getFeeAmount('i20_control_fee')}
                                scholarshipsIds={applicationDetails?.scholarships?.id ? [applicationDetails.scholarships.id] : []}
                                metadata={{
                                  application_id: applicationDetails?.id,
                                  selected_scholarship_id: applicationDetails?.scholarships?.id
                                }}
                                onSuccess={() => {
                                  setZelleActive(false);
                                  fetchApplicationDetails(true);
                                  refetchPaymentStatus();
                                }}
                                onProcessingChange={(isProcessing) => {
                                  if (isProcessing) refetchPaymentStatus();
                                }}
                                className="w-full"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Stripe Option */}
                            <button
                              onClick={() => handlePaymentMethodSelect('stripe')}
                              disabled={i20Loading}
                              className="group/btn relative bg-white border border-gray-200 p-6 rounded-[2rem] text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 flex items-center"
                            >
                              <div className="w-14 h-14 flex items-center justify-center bg-blue-50 transition-colors rounded-2xl mr-5">
                                <StripeIcon className="w-9 h-9" />
                              </div>
                              <div className="flex-1 flex flex-col justify-center">
                                 <div className="flex items-baseline justify-between leading-none">
                                    <span className="font-bold text-gray-900 text-lg">Cartão de Crédito</span>
                                    <span className="text-slate-900 text-xl font-black px-3 uppercase tracking-tight">
                                      {formatFeeAmount(calculateCardAmountWithFees(promotionalCouponValidation?.finalAmount || getFeeAmount('i20_control_fee')))}
                                    </span>
                                 </div>
                                 <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-0.5 leading-none">* Podem incluir taxas de processamento</p>
                              </div>
                              {selectedPaymentMethod === 'stripe' && i20Loading && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                </div>
                              )}
                            </button>

                            {/* PIX Option */}
                            <button
                              onClick={() => handlePaymentMethodSelect('pix', exchangeRate)}
                              disabled={i20Loading}
                              className="group/btn relative bg-white border border-gray-200 p-6 rounded-[2rem] text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 flex items-center"
                            >
                              <div className="w-14 h-14 flex items-center justify-center bg-emerald-50 transition-colors rounded-2xl mr-5">
                                <PixIcon className="w-9 h-9" />
                              </div>
                              <div className="flex-1 flex flex-col justify-center">
                                 <div className="flex items-baseline justify-between leading-none">
                                    <span className="font-bold text-gray-900 text-lg">PIX</span>
                                    <span className="text-slate-900 text-xl font-black px-3 uppercase tracking-tight">
                                      R$ {calculatePIXTotalWithIOF(promotionalCouponValidation?.finalAmount || getFeeAmount('i20_control_fee'), exchangeRate).totalWithIOF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                 </div>
                                 <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-0.5 leading-none">* Podem incluir taxas de processamento</p>
                              </div>
                              {selectedPaymentMethod === 'pix' && i20Loading && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                                </div>
                              )}
                            </button>

                            {/* Parcelow Option */}
                            <div className="flex flex-col">
                              <button
                                onClick={() => handlePaymentMethodSelect('parcelow')}
                                disabled={i20Loading}
                                className="group/btn relative bg-white border border-gray-200 p-6 rounded-[2rem] text-left hover:scale-[1.01] active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 flex items-center"
                              >
                                <div className="w-14 h-14 flex items-center justify-center bg-orange-50 transition-colors rounded-2xl mr-5 px-1">
                                  <ParcelowIcon className="w-full h-10" />
                                </div>
                                <div className="flex-1 flex flex-col justify-center">
                                   <div className="flex items-baseline justify-between leading-none">
                                      <span className="font-bold text-gray-900 text-lg">Parcelow</span>
                                      <div className="text-right flex flex-col items-end leading-none">
                                        <span className="text-slate-900 text-xl font-black px-3 uppercase tracking-tight">
                                          {formatFeeAmount(promotionalCouponValidation?.finalAmount || getFeeAmount('i20_control_fee'))}
                                        </span>
                                        <div className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Em até 12x</div>
                                      </div>
                                   </div>
                                   <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold -mt-1.5 leading-none">* Podem incluir taxas da operadora e processamento da plataforma</p>
                                </div>
                                {selectedPaymentMethod === 'parcelow' && i20Loading && (
                                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                                  </div>
                                )}
                              </button>

                              {/* Campo inline de CPF para Parcelow */}
                              {showInlineCpf && (
                                <div className="p-6 bg-blue-50 border-2 border-blue-100 rounded-2xl mt-4 space-y-4 animate-fadeIn relative z-0 shadow-[0_15px_30px_rgba(59,130,246,0.1)]">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                    <div className="flex-initial sm:w-[300px]">
                                      <p className="text-[11px] font-black text-blue-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Shield className="w-3 h-3" />
                                        Verificação Obrigatória Parcelow
                                      </p>
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={inlineCpf}
                                          onChange={(e) => {
                                            setInlineCpf(formatCpf(e.target.value));
                                            setCpfError(null);
                                          }}
                                          placeholder="Digite seu CPF (000.000.000-00)"
                                          maxLength={14}
                                          className="w-full px-4 py-3 rounded-xl border border-blue-200 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-all shadow-sm"
                                        />
                                      </div>
                                    </div>
                                    <button
                                      onClick={saveCpfAndCheckout}
                                      disabled={savingCpf || inlineCpf.replace(/\D/g, '').length !== 11}
                                      className="sm:mt-6 px-8 py-3 rounded-xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95"
                                    >
                                      {savingCpf ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ir ao pagamento'}
                                    </button>
                                  </div>
                                  {cpfError && (
                                    <p className="text-xs text-red-600 flex items-center gap-1 font-bold animate-pulse">
                                      <AlertCircle className="w-4 h-4" />
                                      {cpfError}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Zelle Option — accordion inline */}
                            <div className="flex flex-col">
                              <button
                                onClick={() => {
                                  setShowInlineCpf(false);
                                  setZelleActive(!zelleActive);
                                }}
                                disabled={i20Loading}
                                className={`group/btn relative bg-white border p-6 text-left hover:scale-[1.01] active:scale-[0.99] transition-all shadow-sm hover:shadow-md disabled:opacity-50 hover:border-blue-600/30 hover:bg-blue-50/10 flex items-center ${
                                  zelleActive
                                    ? 'rounded-t-[2rem] border-slate-200 border-b-0 bg-slate-50/30'
                                    : 'rounded-[2rem] border-gray-200 shadow-sm hover:shadow-md'
                                }`}
                              >
                                <div className="w-14 h-14 flex items-center justify-center bg-purple-50 transition-colors rounded-2xl mr-5">
                                  <ZelleIcon className="w-9 h-9" />
                                </div>
                                <div className="flex-1 flex flex-col justify-center">
                                   <div className="flex items-baseline justify-between leading-none">
                                      <span className="font-bold text-gray-900 text-lg">Zelle</span>
                                      <div className="text-right flex flex-col items-end leading-none">
                                        <div className="text-slate-900 text-xl font-black px-3 uppercase tracking-tight">
                                          {formatFeeAmount(promotionalCouponValidation?.finalAmount || getFeeAmount('i20_control_fee'))}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-900 block uppercase tracking-widest text-right">Sem Taxas</span>
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-2 text-gray-400 -mt-1.5">
                                      <AlertCircle className="w-3.5 h-3.5" />
                                      <span className="text-[10px] font-bold uppercase tracking-wide leading-none">Processamento pode levar até 48 horas</span>
                                   </div>
                                </div>
                              </button>

                              {zelleActive && (
                                <div className="border border-slate-200 border-t-0 rounded-b-[2rem] overflow-hidden bg-white shadow-sm">
                                  <ZelleCheckout
                                    feeType="i20_control_fee"
                                    amount={promotionalCouponValidation?.finalAmount ?? getFeeAmount('i20_control_fee')}
                                    scholarshipsIds={applicationDetails?.scholarships?.id ? [applicationDetails.scholarships.id] : []}
                                    metadata={{
                                      application_id: applicationDetails?.id,
                                      selected_scholarship_id: applicationDetails?.scholarships?.id
                                    }}
                                    onSuccess={() => {
                                      setZelleActive(false);
                                      fetchApplicationDetails(true);
                                      refetchPaymentStatus();
                                    }}
                                    onProcessingChange={(isProcessing) => {
                                      if (isProcessing) refetchPaymentStatus();
                                    }}
                                    className="w-full"
                                  />
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Success Header */}
                  <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 p-12 text-center relative">
                       <div className="absolute inset-0 opacity-10 pointer-events-none">
                         <Stamp className="w-64 h-64 -left-16 -top-16 absolute -rotate-12" />
                         <CheckCircle className="w-64 h-64 -right-16 -bottom-16 absolute rotate-12" />
                       </div>
                       <div className="relative z-10 space-y-6">
                         <div className="w-24 h-24 bg-white/20 rounded-[2rem] flex items-center justify-center mx-auto backdrop-blur-md shadow-inner">
                           <CheckCircle2 className="w-12 h-12 text-white" />
                         </div>
                         <div className="space-y-2">
                           <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">Pagamento <span className="text-emerald-200">Confirmado</span></h2>
                           <p className="text-emerald-100 text-lg font-medium">Sua taxa de controle I-20 foi processada com sucesso!</p>
                         </div>
                       </div>
                    </div>

                    <div className="p-8 md:p-16 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 group hover:shadow-xl transition-all flex flex-col items-center text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Valor Pago</p>
                          <div className="flex items-center">
                             <p className="text-4xl font-black text-slate-900 tracking-tighter">
                               {realI20PaidAmount ? formatFeeAmount(realI20PaidAmount) : formatFeeAmount(getFeeAmount('i20_control_fee'))}
                             </p>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 group hover:shadow-xl transition-all flex flex-col items-center text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Data da Transação</p>
                          <div className="flex items-center">
                             <p className="text-4xl font-black text-slate-900 tracking-tighter">
                               {realI20PaymentDate ? new Date(realI20PaymentDate).toLocaleDateString() : new Date().toLocaleDateString()}
                             </p>
                          </div>
                        </div>

                    </div>
                  </div>


                </div>
              )}
            </div>
          )}

