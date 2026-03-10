'use client'

import { useState } from 'react'
import { ChevronDown, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PendingApplicationCard from '@/components/pending-application-card'

interface Application {
  id: number
  university: string
  program: string
  status: string
  submittedDate: string
}

interface PendingApplicationsSectionProps {
  applications: Application[]
  expanded: boolean
  onToggle: (expanded: boolean) => void
}

export default function PendingApplicationsSection({
  applications,
  expanded,
  onToggle,
}: PendingApplicationsSectionProps) {
  return (
    <div className="space-y-6">
      {/* Toggle Button */}
      <button
        onClick={() => onToggle(!expanded)}
        className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 border-2 border-gray-300 rounded-xl p-6 transition-all duration-300 group"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 group-hover:bg-blue-200 rounded-lg transition-colors">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-left">
            <h2 className="text-xl font-bold text-gray-900">
              Aplicações Pendentes
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              {applications.length} candidaturas em processamento
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-6 h-6 text-gray-600 transition-transform duration-300 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expandable Content */}
      {expanded && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {applications.map((app) => (
              <PendingApplicationCard key={app.id} application={app} />
            ))}
          </div>

          {/* Info Message */}
          <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-6 flex gap-4 mt-8">
            <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900">
                Status das candidaturas
              </h3>
              <p className="text-amber-800 text-sm mt-1">
                O processo de análise pode levar até 30 dias. Acompanhe o progresso das suas candidaturas aqui.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
