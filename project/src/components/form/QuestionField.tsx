import { Question } from '@/data/formQuestions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '../../lib/cn';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface QuestionFieldProps {
    question: Question;
    value: string;
    extraValue?: string;
    onChange: (value: string, customId?: number) => void;
    onExtraChange?: (value: string) => void;
    error?: string;
    answers: Record<number, string>;
}

const QuestionField = ({ question, value, extraValue, onChange, onExtraChange, error, answers }: QuestionFieldProps) => {
    const { t } = useTranslation();

    // Check conditional visibility
    if (question.conditionalOn) {
        const parentAnswer = answers[question.conditionalOn.questionId];
        if (parentAnswer !== question.conditionalOn.value) return null;
    }

    const showExtraField = question.extraFieldOn && value === question.extraFieldOn.value;

    return (
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm mb-4">
            <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4 mb-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold border border-blue-100">
                    {question.id}
                </span>
                <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 leading-snug">
                        {t(question.text)}
                        {question.required && <span className="text-red-500 ml-1">*</span>}
                    </h3>
                    {question.prompt && (
                        <p className="text-sm text-slate-500 mt-1 italic">{t(question.prompt)}</p>
                    )}
                </div>
            </div>

            <div className="ml-0 sm:ml-12">
                {(question.type === 'text' || question.type === 'email') && (
                    <Input
                        type={question.type}
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={question.placeholder ? t(question.placeholder) : ''}
                        className="max-w-md"
                    />
                )}

                {question.type === 'number' && (
                    <Input
                        type="text"
                        value={value || ''}
                        onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            onChange(val);
                        }}
                        placeholder={question.placeholder ? t(question.placeholder) : ''}
                        className="max-w-xs"
                        maxLength={15}
                        min={0}
                    />
                )}

                {question.type === 'date' && (
                    <Input
                        type="date"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className="max-w-xs"
                    />
                )}

                {question.type === 'textarea' && (
                    <Textarea
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={question.placeholder ? t(question.placeholder) : ''}
                        rows={4}
                        className="max-w-lg"
                    />
                )}

                {(question.type === 'radio' || question.type === 'yesno' || question.type === 'truefalse') && (
                    <div className="flex flex-col gap-2">
                        {question.type === 'yesno' && (
                            <>
                                {['Sim', 'Não'].map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => onChange(opt)}
                                        className={cn(
                                            'flex items-center w-full px-4 py-3 rounded-xl border text-left transition-all duration-200',
                                            value === opt
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                                : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/30'
                                        )}
                                    >
                                        <span className="font-medium text-sm">{t(`common.${opt === 'Sim' ? 'yes' : 'no'}`)}</span>
                                    </button>
                                ))}
                            </>
                        )}
                        {question.type === 'truefalse' && (
                            <>
                                {question.options?.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => onChange(opt.value)}
                                        className={cn(
                                            'flex items-center w-full px-4 py-3 rounded-xl border text-left transition-all duration-200',
                                            value === opt.value
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                                : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/30'
                                        )}
                                    >
                                        <span className="font-medium text-sm">{t(opt.label)}</span>
                                    </button>
                                ))}
                            </>
                        )}
                        {question.type === 'radio' && question.options?.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => onChange(opt.value)}
                                className={cn(
                                    'flex items-center w-full px-4 py-3 rounded-xl border text-left transition-all duration-200',
                                    value === opt.value
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                        : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/30'
                                )}
                            >
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm">{t(opt.label)}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Extra conditional field */}
                {showExtraField && question.extraFieldOn && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <label className="text-xs font-semibold text-slate-600 mb-2 block uppercase tracking-wider">
                            {t(question.extraFieldOn.label)}
                        </label>
                        <Input
                            type={question.extraFieldOn.type === 'number' ? 'number' : 'text'}
                            value={extraValue || ''}
                            onChange={(e) => onExtraChange?.(e.target.value)}
                            placeholder={question.placeholder ? t(question.placeholder) : ''}
                            className="max-w-md bg-white"
                            min={question.extraFieldOn.type === 'number' ? 0 : undefined}
                        />
                    </div>
                )}

                {/* Q4 extra fields: Status + Expiration Date */}
                {question.id === 4 && value === 'Sim' && (
                    <div className="mt-4 space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                            <label className="text-xs font-semibold text-slate-600 mb-2 block uppercase tracking-wider">
                                {t('selectionSurvey.questions.4.extraLabel')}
                            </label>
                            <Input
                                type="text"
                                value={answers[-4] || ''}
                                onChange={(e) => onChange(e.target.value, -4)}
                                placeholder="Ex: B1/B2, F-1, etc."
                                className="max-w-md bg-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-600 mb-2 block uppercase tracking-wider">
                                {t('common.expirationDate')}
                            </label>
                            <Input
                                type="date"
                                value={answers[-41] || ''}
                                onChange={(e) => onChange(e.target.value, -41)}
                                className="max-w-md bg-white"
                            />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 mt-3 text-red-600 text-sm font-medium animate-fade-in">
                        <AlertCircle className="w-4 h-4" />
                        <span>{t(error)}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuestionField;
