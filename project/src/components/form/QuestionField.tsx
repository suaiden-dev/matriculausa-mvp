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
    allQuestions?: Question[];
    isNested?: boolean;
}

const QuestionContent = ({ 
    question, 
    value, 
    extraValue, 
    onChange, 
    onExtraChange, 
    error, 
    answers, 
    allQuestions,
    isNested 
}: QuestionFieldProps) => {
    const { t } = useTranslation();

    // Check conditional visibility - only if NOT nested (nested visibility is handled by parent)
    if (!isNested && question.conditionalOn) {
        const parentAnswer = answers[question.conditionalOn.questionId];
        if (parentAnswer !== question.conditionalOn.value) return null;
    }

    const showExtraField = question.extraFieldOn && value === question.extraFieldOn.value;

    const renderNestedQuestions = (optValue: string) => {
        if (!allQuestions) return null;
        
        const nested = allQuestions.filter(q => 
            q.conditionalOn && 
            q.conditionalOn.questionId === question.id && 
            q.conditionalOn.value === optValue
        );

        if (nested.length === 0) return null;

        return (
            <div className="mt-4 mb-6 ml-4 sm:ml-6 space-y-6 border-l-2 border-blue-100 pl-4 sm:pl-6 animate-in fade-in slide-in-from-left-2 duration-300">
                {nested.map(nestedQ => (
                    <QuestionField 
                        key={nestedQ.id}
                        question={nestedQ}
                        value={answers[nestedQ.id]}
                        extraValue={undefined} // Adjust if needed
                        onChange={(val, cid) => onChange(val, cid ?? nestedQ.id)}
                        onExtraChange={onExtraChange}
                        error={undefined} // TODO: pass specific error if available
                        answers={answers}
                        allQuestions={allQuestions}
                        isNested={true}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className={cn("flex-1", isNested ? "pb-2" : "ml-0 sm:ml-12")}>
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
                                <div key={opt} className="w-full">
                                    <button
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
                                    {value === opt && renderNestedQuestions(opt === 'Sim' ? 'sim' : 'nao')}
                                    {/* Fallback for cases where value matches exactly */}
                                    {value === opt && renderNestedQuestions(opt)}
                                </div>
                            ))}
                        </>
                    )}
                    {question.type === 'truefalse' && (
                        <>
                            {question.options?.map((opt) => (
                                <div key={opt.value} className="w-full">
                                    <button
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
                                    {value === opt.value && renderNestedQuestions(opt.value)}
                                </div>
                            ))}
                        </>
                    )}
                    {question.type === 'radio' && question.options?.map((opt) => (
                        <div key={opt.value} className="w-full">
                            <button
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
                            {value === opt.value && renderNestedQuestions(opt.value)}
                        </div>
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
    );
};

const QuestionField = (props: QuestionFieldProps) => {
    const { question, isNested, answers } = props;
    const { t } = useTranslation();

    // Se for aninhado, não renderizamos o wrapper do card, apenas o conteúdo
    if (isNested) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold border border-blue-100">
                        {question.id}
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm">
                        {t(question.text)}
                        {question.required && <span className="text-red-500 ml-1">*</span>}
                    </h4>
                </div>
                <QuestionContent {...props} />
            </div>
        );
    }

    // Check conditional visibility for root questions
    if (question.conditionalOn) {
        const parentAnswer = answers[question.conditionalOn.questionId];
        if (parentAnswer !== question.conditionalOn.value) return null;
    }

    return (
        <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-sm mb-6 hover:border-blue-200 transition-colors">
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-5 mb-6">
                <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-base font-black border border-blue-100 shadow-sm">
                    {question.id}
                </span>
                <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">
                        {t(question.text)}
                        {question.required && <span className="text-red-500 ml-1">*</span>}
                    </h3>
                    {question.prompt && (
                        <p className="text-sm text-slate-500 mt-2 font-medium bg-slate-50 inline-block px-3 py-1 rounded-lg border border-slate-100">
                            {t(question.prompt)}
                        </p>
                    )}
                </div>
            </div>

            <QuestionContent {...props} />
        </div>
    );
};

export default QuestionField;
