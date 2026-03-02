import { calculateScore } from '@/data/formQuestions';
import { CheckCircle2, XCircle, Trophy, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface ResultsPageProps {
    answers: Record<number, string>;
    onRestart?: () => void; // Mantendo opcional se for chamado pelo pai, mas não usado aqui
    onFinish?: () => void;
    onEdit?: () => void;
}

const ResultsPage = ({ answers, onFinish, onEdit }: ResultsPageProps) => {
    const { t } = useTranslation();
    const { score, total, percentage } = calculateScore(answers);
    const passed = percentage >= 80;

    return (
        <div className="max-w-2xl mx-auto text-center py-12 px-4 animate-fade-in">
            <div className={`w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 duration-300 ${passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {passed ? (
                    <Trophy className="w-12 h-12" />
                ) : (
                    <XCircle className="w-12 h-12" />
                )}
            </div>

            <h1 className="text-3xl font-bold mb-2 text-slate-900">
                {passed ? t('selectionSurvey.results.congratulations') : t('selectionSurvey.results.failed')}
            </h1>

            <p className="text-slate-600 mb-8 text-lg">
                {passed
                    ? t('selectionSurvey.results.passedMessage')
                    : t('selectionSurvey.results.failedMessage')}
            </p>

            <div className="bg-white border border-slate-200 rounded-3xl p-8 mb-8 shadow-sm relative overflow-hidden">
                {passed && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16" />
                )}
                <div className={`text-6xl font-bold mb-2 ${passed ? 'text-green-600' : 'text-red-600'}`}>
                    {percentage}%
                </div>
                <p className="font-medium text-slate-500 uppercase tracking-wider text-sm">
                    {score} {t('selectionSurvey.results.of')} {total} {t('selectionSurvey.results.correct')}
                </p>
                <div className="w-full h-4 bg-slate-100 rounded-full mt-6 overflow-hidden border border-slate-200 p-0.5">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${passed ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-400 mt-3 px-1">
                    <span>0%</span>
                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{t('selectionSurvey.results.minRequired')}</span>
                    <span>100%</span>
                </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 shadow-sm text-left">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    {t('selectionSurvey.results.summary')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-tighter mb-0.5">{t('common.name')}:</span>
                        <p className="font-semibold text-slate-800">{answers[1] || '—'}</p>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-tighter mb-0.5">{t('common.email')}:</span>
                        <p className="font-semibold text-slate-800 truncate">{answers[2] || '—'}</p>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-tighter mb-0.5">WhatsApp:</span>
                        <p className="font-semibold text-slate-800">{answers[3] || '—'}</p>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-tighter mb-0.5">{t('common.profile')}:</span>
                        <p className="font-semibold text-slate-800 capitalize italic">
                            {answers[5] ? t(`selectionSurvey.questions.5.options.${answers[5]}`) : '—'}
                        </p>
                    </div>
                </div>
            </div>

            <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">
                {passed
                    ? t('selectionSurvey.results.ctaDescription')
                    : t('selectionSurvey.results.failedAdvice')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {passed ? (
                    <Button onClick={onFinish} size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 py-6 text-lg shadow-blue-200 shadow-xl transition-all hover:-translate-y-1">
                        {t('selectionSurvey.results.ctaDashboard')}
                        <ArrowRight className="w-5 h-5" />
                    </Button>
                ) : (
                    <Button onClick={onEdit} size="lg" className="gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-12 py-6 text-lg shadow-xl shadow-slate-200 transition-all hover:-translate-y-1">
                        {t('selectionSurvey.results.ctaRetry')}
                        <ArrowRight className="w-5 h-5" />
                    </Button>
                )}
            </div>
        </div>
    );
};

export default ResultsPage;
