'use client'

import { useState } from 'react'
import { ChevronDown, Award, GraduationCap, DollarSign, AlertCircle, CheckCircle, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ApprovedScholarshipCard from '@/components/approved-scholarship-card'
import PendingApplicationsSection from '@/components/pending-applications-section'

export default function DashboardPage() {
  const [expandedPending, setExpandedPending] = useState(false)

  const approvedScholarships = [
    {
      id: 1,
      university: 'Universidade de São Paulo (USP)',
      program: 'Bolsa de Excelência Acadêmica',
      amount: 'R$ 5.000,00',
      status: 'APROVADA',
      paymentStatus: 'Pagamento pendente',
      nextPayment: '15/12/2025',
      badge: 'Premium',
    },
    {
      id: 2,
      university: 'Universidade Federal do Rio de Janeiro (UFRJ)',
      program: 'Bolsa Integral - Graduação',
      amount: 'R$ 8.500,00',
      status: 'APROVADA',
      paymentStatus: 'Pagamento confirmado',
      nextPayment: '05/01/2026',
      badge: 'Integral',
    },
  ]

  const pendingApplications = [
    {
      id: 1,
      university: 'Universidade Estadual Paulista (UNESP)',
      program: 'Bolsa de Pesquisa',
      status: 'Em análise',
      submittedDate: '10/11/2025',
    },
    {
      id: 2,
      university: 'Universidade de Brasília (UnB)',
      program: 'Bolsa de Mobilidade Acadêmica',
      status: 'Documentação incompleta',
      submittedDate: '05/11/2025',
    },
    {
      id: 3,
      university: 'Pontifícia Universidade Católica (PUC-RJ)',
      program: 'Bolsa Parcial',
      status: 'Em análise',
      submittedDate: '08/11/2025',
    },
  ]

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <GraduationCap className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Bolsas Universitárias
              </h1>
              <p className="text-gray-600 mt-1">
                Acompanhe suas bolsas aprovadas e aplicações pendentes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Approved Scholarships Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center gap-2 bg-green-100 rounded-full px-4 py-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold text-green-700">
                {approvedScholarships.length} Bolsas Aprovadas
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {approvedScholarships.map((scholarship) => (
              <ApprovedScholarshipCard
                key={scholarship.id}
                scholarship={scholarship}
              />
            ))}
          </div>
        </div>

        {/* Alert */}
        <div className="mb-12 bg-blue-50 border-l-4 border-blue-400 rounded-lg p-6 flex gap-4">
          <AlertCircle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">Importante</h3>
            <p className="text-blue-800 text-sm mt-1">
              Mantenha seus dados cadastrais atualizados. Qualquer alteração deve ser comunicada ao setor de bolsas em até 48 horas.
            </p>
          </div>
        </div>

        {/* Pending Applications Section */}
        <PendingApplicationsSection
          applications={pendingApplications}
          expanded={expandedPending}
          onToggle={setExpandedPending}
        />
      </div>
    </main>
  )
}
