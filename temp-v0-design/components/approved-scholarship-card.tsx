'use client'

import { CreditCard, CheckCircle, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Scholarship {
  id: number
  university: string
  program: string
  amount: string
  status: string
  paymentStatus: string
  nextPayment: string
  badge: string
}

export default function ApprovedScholarshipCard({
  scholarship,
}: {
  scholarship: Scholarship
}) {
  return (
    <div className="bg-white rounded-2xl border-4 border-green-500 shadow-lg p-12 hover:shadow-xl transition-shadow duration-300 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-transparent opacity-40 pointer-events-none" />

      <div className="relative z-10">
        {/* Status Badge */}
        <div className="absolute top-6 right-6">
          <span className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md">
            <CheckCircle className="w-4 h-4" />
            {scholarship.status}
          </span>
        </div>

        {/* Secondary Badge */}
        <div className="mb-6">
          <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-semibold">
            {scholarship.badge}
          </span>
        </div>

        {/* University and Program */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
            {scholarship.university}
          </h3>
          <p className="text-gray-600 text-base">{scholarship.program}</p>
        </div>

        {/* Amount Section */}
        <div className="bg-green-100 rounded-xl p-6 mb-8 border-2 border-green-200">
          <p className="text-gray-700 text-sm font-medium mb-2">Valor da Bolsa</p>
          <p className="text-4xl font-bold text-green-700">{scholarship.amount}</p>
        </div>

        {/* Payment Status */}
        <div className="space-y-4 mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-white rounded-lg">
              <CreditCard className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">Status de Pagamento</p>
              <p className="font-semibold text-gray-900 mt-1">
                {scholarship.paymentStatus}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 pt-3 border-t border-gray-200">
            <div className="p-2 bg-white rounded-lg">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">Próximo Pagamento</p>
              <p className="font-semibold text-gray-900 mt-1">
                {scholarship.nextPayment}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all text-base h-auto"
          >
            Processar Pagamento
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-2 border-gray-300 hover:bg-gray-50 font-semibold py-3 rounded-lg text-base h-auto"
          >
            Mais Informações
          </Button>
        </div>
      </div>
    </div>
  )
}
