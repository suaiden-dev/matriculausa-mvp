const fs = require('fs');
const filepath = 'project/src/pages/StudentOnboarding/components/SelectionFeeStep.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const startStr = `<div className="flex-1 min-w-0">\r\n                              <div className="flex items-center justify-between">`;
const startStr2 = `<div className="flex-1 min-w-0">\n                              <div className="flex items-center justify-between">`;

let startIdx = content.indexOf(startStr);
if (startIdx === -1) {
  startIdx = content.indexOf(startStr2);
}
if (startIdx === -1) {
  // Let's try finding the method.name inside the map
  startIdx = content.indexOf('<div className="flex-1 min-w-0">');
  while (startIdx !== -1) {
      const peek = content.substring(startIdx, startIdx + 300);
      if (peek.includes('{method.name}')) {
          break;
      }
      startIdx = content.indexOf('<div className="flex-1 min-w-0">', startIdx + 1);
  }
}

if (startIdx === -1) {
  console.log('Start index not found');
  process.exit(1);
}

const endIdx = content.indexOf('</button>', startIdx);
if (endIdx === -1) {
    console.log('End index not found');
    process.exit(1);
}

// Remove the bad block
const originalBlock = content.substring(startIdx, endIdx);

// The correct block
const correctBlock = `<div className="flex-1 min-w-0">
                              <div className="flex flex-col w-full">
                                <div className="flex items-end justify-between w-full">
                                  <h4 className="text-base sm:text-lg font-black text-gray-900 uppercase tracking-tight">
                                    {method.name}
                                  </h4>

                                  <div className="flex items-end gap-3 flex-shrink-0">
                                    {method.id === 'stripe' && cardAmountWithFees > 0 && (
                                      <span className="text-gray-900 text-lg font-black">
                                        \${cardAmountWithFees.toFixed(2)}
                                      </span>
                                    )}
                                    {method.id === 'parcelow' && computedBasePrice > 0 && (
                                      <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-bold text-slate-900 mb-0.5 block uppercase tracking-widest leading-tight">
                                          {t('selectionFeeStep.main.parcelowInstallments')}
                                        </span>
                                        <span className="text-gray-900 text-lg font-black">
                                          \${computedBasePrice.toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                    {method.id === 'pix' && pixAmountWithFees > 0 && exchangeRate && (
                                       <span className="text-gray-900 text-lg font-black">
                                         R$ {pixAmountWithFees.toFixed(2)}
                                       </span>
                                    )}
                                    {method.id === 'zelle' && computedBasePrice > 0 && (
                                       <span className="text-gray-900 text-lg font-black">
                                         \${computedBasePrice.toFixed(2)}
                                       </span>
                                    )}
                                    
                                    {isProcessing && (
                                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
                                    )}
                                    {isSelected && !loading && (
                                      <div className="bg-blue-500 rounded-full p-1 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                        <CheckCircle className="w-4 h-4 text-white" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="mt-1">
                                  {method.id === 'stripe' && (
                                    <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wide leading-tight">{t('selectionFeeStep.main.processingFees.card')}</span>
                                  )}
                                  {method.id === 'pix' && (
                                    <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wide leading-tight">{t('selectionFeeStep.main.processingFees.pix')}</span>
                                  )}
                                  {method.id === 'parcelow' && (
                                    <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wide leading-tight">{t('selectionFeeStep.main.processingFees.parcelow')}</span>
                                  )}
                                  {method.id === 'zelle' && (
                                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-wide leading-tight">
                                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                      {t('selectionFeeStep.main.processingFees.zelle')}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {isDisabled && !!isBlocked && !!pendingPayment && method.id !== 'zelle' && (
                                <div className="mt-3 flex items-center space-x-2 bg-amber-50 border border-amber-100 w-fit px-2 py-1 rounded-lg">
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                  <span className="text-[10px] text-amber-600 font-bold uppercase tracking-tight">
                                    {t('selectionFeeStep.main.zelleUnavailable')}
                                  </span>
                                </div>
                              )}
                            </div>
                          `;

content = content.replace(originalBlock, correctBlock);
fs.writeFileSync(filepath, content);
console.log('Fixed file via Node.js');
