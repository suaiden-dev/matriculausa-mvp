'use client'

import { Calendar, Building2, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Application {
  id: number
  university: string
  program: string
  status: string
  submittedDate: string
}

export default function PendingApplicationCard({
  application,
}: {
  application: Application
}) {
  const getStatusColor = (status: string) => {
    if (status.includes('análise')) {
      return { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' }
    }
    if (status.includes('incompleta')) {
      return { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700' }
    }
    return { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-700' }
  }

  const colors = getStatusColor(application.status)

  return (
    <div
      className={`${colors.bg} border-2 ${colors.border} rounded-xl p-6 hover:shadow-md transition-shadow duration-300`}
    >
      <div className="space-y-4">
        {/* Status Badge */}
        <div>
          <span className={`inline-block ${colors.badge} px-3 py-1 rounded-full text-xs font-semibold`}>
            {application.status}
          </span>
        </div>

        {/* University */}
        <div className="flex gap-3">
          <Building2 className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-600">Instituição</p>
            <p className="font-semibold text-gray-900 text-sm mt-0.5">
              {application.university}
            </p>
          </div>
        </div>

        {/* Program */}
        <div className="flex gap-3">
          <BookOpen className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-600">Programa</p>
            <p className="font-semibold text-gray-900 text-sm mt-0.5">
              {application.program}
            </p>
          </div>
        </div>

        {/* Date */}
        <div className="flex gap-3">
          <Calendar className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-600">Data de Envio</p>
            <p className="font-semibold text-gray-900 text-sm mt-0.5">
              {application.submittedDate}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <Button
          variant="outline"
          className="w-full mt-4 border-gray-300 hover:bg-white text-gray-700 font-medium rounded-lg py-2 h-auto"
        >
          Ver Detalhes
        </Button>
      </div>
    </div>
  )
}
