import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Building2, Mail, MessageCircle } from 'lucide-react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { TextField } from '@mui/material';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ForUniversitiesScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    university_name: '',
    contact_email: '',
    preferred_datetime: null as Date | null,
    meeting_type: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  // Initialize default time when modal opens
  useEffect(() => {
    if (isOpen && !formData.preferred_datetime) {
      const defaultTime = getNextBusinessHour(new Date());
      handleInputChange('preferred_datetime', defaultTime);
    }
  }, [isOpen]);

  // Meeting types
  const meetingTypes = [
    { value: 'demo', label: 'Platform Meeting' },
    { value: 'consultation', label: 'Recruitment Consultation' },
    { value: 'partnership', label: 'Strategic Partnership' },
    { value: 'custom', label: 'Custom Meeting' }
  ];

  // Function to check if date is between Monday and Friday
  const isWeekday = (date: Date) => {
    const day = date.getDay();
    // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
    return day >= 1 && day <= 5; // Monday to Friday
  };

  // Function to get next available weekday
  const getNextWeekday = (date: Date) => {
    let nextDate = new Date(date);
    while (!isWeekday(nextDate)) {
      nextDate.setDate(nextDate.getDate() + 1);
    }
    return nextDate;
  };

  // Function to check if a date is within business hours
  const isBusinessHours = (date: Date) => {
    if (!isWeekday(date)) {
      return false;
    }
    
    const localHour = date.getHours();
    const localMinutes = date.getMinutes();
    const localSeconds = date.getSeconds();
    
    // Check if minutes and seconds are 0 (exact hour intervals only)
    const isExactHour = localMinutes === 0 && localSeconds === 0;
    
    // Define allowed business hours: 9 AM - 5 PM (9, 10, 11, 12, 13, 14, 15, 16, 17)
    const allowedHours = [9, 10, 11, 12, 13, 14, 15, 16, 17];
    const isBusinessHour = allowedHours.includes(localHour) && isExactHour;
    
    return isBusinessHour;
  };

  // Function to validate business hours for the selected date
  const validateBusinessHours = (date: Date) => {
    if (!isWeekday(date)) {
      return false;
    }
    
    const localHour = date.getHours();
    const allowedHours = [9, 10, 11, 12, 13, 14, 15, 16, 17];
    
    // Only check if the hour is within allowed range
    // Minutes and seconds validation is handled separately
    return allowedHours.includes(localHour);
  };

  // Function to get next available business hour
  const getNextBusinessHour = (date: Date) => {
    let nextDate = new Date(date);
    
    // If it's weekend, move to next Monday
    if (!isWeekday(nextDate)) {
      nextDate = getNextWeekday(nextDate);
    }
    
    // Set to 9 AM local time
    nextDate.setHours(9, 0, 0, 0);
    
    // Ensure we're not setting a time in the past
    const now = new Date();
    if (nextDate <= now) {
      // If the calculated time is in the past, move to next day
      nextDate.setDate(nextDate.getDate() + 1);
      nextDate.setHours(9, 0, 0, 0);
    }
    
    return nextDate;
  };

  // Function to get next valid business hour from a given time
  const getNextValidBusinessHour = (date: Date) => {
    const currentHour = date.getHours();
    const allowedHours = [9, 10, 11, 12, 13, 14, 15, 16, 17];
    
    // Find the next allowed hour
    let nextHour = allowedHours.find(hour => hour > currentHour);
    
    if (!nextHour) {
      // If no hour found today, move to next business day at 9 AM
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      return getNextBusinessHour(nextDay);
    }
    
    // Set to the next valid hour
    const nextTime = new Date(date);
    nextTime.setHours(nextHour, 0, 0, 0);
    return nextTime;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.university_name || !formData.contact_email || !formData.preferred_datetime || !formData.meeting_type) {
      setSubmitStatus('error');
      setSubmitMessage('Please fill in all required fields.');
      return;
    }

    // Additional validation for weekdays
    if (formData.preferred_datetime && !isWeekday(formData.preferred_datetime)) {
      setSubmitStatus('error');
      setSubmitMessage('Please select a weekday (Monday - Friday) for your meeting.');
      return;
    }

    // Additional validation for business hours
    if (formData.preferred_datetime && !isBusinessHours(formData.preferred_datetime)) {
      setSubmitStatus('error');
      setSubmitMessage('Please select a time between 9:00 AM and 5:00 PM (local time) in 1-hour intervals only.');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // O usuário seleciona o horário como se fosse Eastern Time (EUA)
      // Não precisamos fazer conversão, apenas enviar o horário selecionado
      const selectedTime = formData.preferred_datetime;
      
      // Criar string no formato ISO (Eastern Time)
      const year = selectedTime.getFullYear();
      const month = String(selectedTime.getMonth() + 1).padStart(2, '0');
      const day = String(selectedTime.getDate()).padStart(2, '0');
      const hours = String(selectedTime.getHours()).padStart(2, '0');
      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
      const seconds = String(selectedTime.getSeconds()).padStart(2, '0');
      
      // Formato: YYYY-MM-DDTHH:MM:SS (assumindo Eastern Time)
      const easternDateTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

      // Debug: Verificar se a hora está sendo extraída corretamente
      console.log('🔍 Debug - Extração da hora:', {
        selectedTime: selectedTime,
        getHours: selectedTime.getHours(),
        hours: hours,
        minutes: minutes,
        fullDateTime: easternDateTimeString
      });

      const payload = {
        university_name: formData.university_name,
        contact_email: formData.contact_email,
        preferred_datetime: easternDateTimeString, // Horário selecionado como Eastern Time
        preferred_date: `${year}-${month}-${day}`, // Data no formato YYYY-MM-DD
        preferred_time: `${hours}:${minutes}`, // Hora no formato HH:MM
        timezone: 'America/New_York', // Fuso horário dos Estados Unidos
        // Informações para debug e validação
        local_datetime: formData.preferred_datetime.toLocaleString(),
        selected_hours: hours,
        selected_minutes: minutes,
        user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        utc_offset_minutes: formData.preferred_datetime.getTimezoneOffset(),
        meeting_type: meetingTypes.find(t => t.value === formData.meeting_type)?.label || formData.meeting_type
      };

      // Debug: Log do horário sendo enviado
      console.log('🕐 Debug - Horário selecionado:', {
        original: formData.preferred_datetime,
        localString: formData.preferred_datetime.toLocaleString(),
        isoString: formData.preferred_datetime.toISOString(),
        easternDateTimeString: easternDateTimeString,
        selectedTime: selectedTime,
        selectedHours: hours,
        selectedMinutes: minutes,
        timezone: 'America/New_York',
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        utcOffsetMinutes: formData.preferred_datetime.getTimezoneOffset(),
        payload: payload
      });

      const response = await fetch('https://nwh.suaiden.com/webhook/university-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      // Simplified logic to handle the response
      const responseText = result.response || '';
      const isBusy = responseText.toLowerCase().includes('busy') || responseText.toLowerCase().includes('occupied');
      const isSuccess = responseText.toLowerCase().includes('success') || result.success === true;
      const hasResponse = result.response && result.response.trim() !== '';
      
      if (isBusy) {
        // Time slot busy - show exact webhook message
        setSubmitStatus('error');
        setSubmitMessage(result.response || 'This time slot is busy. Please choose another available time.');
      } else if (isSuccess || !hasResponse) {
        // Success - show webhook message or default message if no response
        setSubmitStatus('success');
        setSubmitMessage(result.response || 'Meeting scheduled successfully! See you soon!');
        
        // Reset form after successful submission
        setTimeout(() => {
          setFormData({
            university_name: '',
            contact_email: '',
            preferred_datetime: null,
            meeting_type: ''
          });
          setSubmitStatus('idle');
          setSubmitMessage('');
        }, 5000); // 5 seconds for user to read the message
      } else {
        // Other types of errors - show exact webhook message
        setSubmitStatus('error');
        setSubmitMessage(result.response || result.message || 'Error scheduling meeting. Please try again.');
      }
    } catch (error) {
      setSubmitStatus('error');
      setSubmitMessage('Connection error. Please check your internet and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="bg-[#05294E] p-2 rounded-xl">
              <CalendarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Schedule Your Meeting</h2>
              <p className="text-slate-600">Let's discuss how to transform your recruitment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            title="Close modal"
            aria-label="Close scheduling modal"
          >
            <X className="h-6 w-6 text-slate-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* University Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Building2 className="inline h-4 w-4 mr-2" />
              University Name *
            </label>
            <input
              type="text"
              value={formData.university_name}
              onChange={(e) => handleInputChange('university_name', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent transition-all"
              placeholder="Enter your institution name"
              required
            />
          </div>

          {/* Contact Email */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Mail className="inline h-4 w-4 mr-2" />
              Contact Email *
            </label>
            <input
              type="email"
              value={formData.contact_email}
              onChange={(e) => handleInputChange('contact_email', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent transition-all"
              placeholder="your-email@university.com"
              required
            />
          </div>

          {/* Meeting Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <MessageCircle className="inline h-4 w-4 mr-2" />
              Meeting Type *
            </label>
            <select
              value={formData.meeting_type}
              onChange={(e) => handleInputChange('meeting_type', e.target.value)}
              className="w-full h-12 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent px-3 py-2"
              required
              title="Meeting type"
              aria-label="Select meeting type"
            >
              <option value="">Select meeting type</option>
              {meetingTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time Picker */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <CalendarIcon className="inline h-4 w-4 mr-2" />
              Preferred Date & Time * (Monday - Friday, 9:00 AM - 5:00 PM local time)
            </label>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                value={formData.preferred_datetime}
                onChange={(newValue) => {
                  if (newValue) {
                    // Create a new date object and round to the nearest hour
                    const roundedTime = new Date(newValue);
                    roundedTime.setMinutes(0, 0, 0);
                    roundedTime.setSeconds(0, 0);
                    roundedTime.setMilliseconds(0);
                    
                    // Always use the rounded time - the shouldDisableTime will prevent invalid selections
                    handleInputChange('preferred_datetime', roundedTime);
                  }
                }}
                minDateTime={getNextBusinessHour(new Date())}
                shouldDisableDate={(date) => !isWeekday(date)}
                shouldDisableTime={(value, view) => {
                  if (view === 'hours') {
                    // Only allow business hours: 9 AM - 5 PM (9, 10, 11, 12, 13, 14, 15, 16, 17)
                    const localHour = value.getHours();
                    const allowedHours = [9, 10, 11, 12, 13, 14, 15, 16, 17];
                    return !allowedHours.includes(localHour);
                  }
                  
                  // Disable minutes view - meetings are only available in 1-hour intervals
                  if (view === 'minutes') {
                    return true;
                  }
                  
                  return false;
                }}
                views={['year', 'month', 'day', 'hours']}
                ampm={true}
                openTo="hours"
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: 'outlined',
                    className: 'w-full',
                    helperText: 'Select a weekday between 9:00 AM - 5:00 PM',
                    sx: {
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        height: '56px',
                        fontSize: '16px',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#05294E',
                          borderWidth: '2px',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#05294E',
                          borderWidth: '2px',
                        },
                      },
                      '& .MuiInputBase-input': {
                        padding: '16px 20px',
                        fontSize: '16px',
                        fontWeight: '500',
                      },
                      '& .MuiFormHelperText-root': {
                        fontSize: '14px',
                        marginTop: '8px',
                        color: '#6b7280',
                      },
                    },
                  },
                  popper: {
                    sx: {
                      '& .MuiPaper-root': {
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        border: '1px solid #e2e8f0',
                      },
                      '& .MuiPickersLayout-root': {
                        minWidth: '400px',
                        minHeight: '500px',
                      },
                      '& .MuiPickersLayout-contentWrapper': {
                        padding: '24px',
                      },
                      '& .MuiPickersLayout-toolbar': {
                        padding: '16px 24px',
                        borderBottom: '1px solid #e2e8f0',
                        '& .MuiTypography-root': {
                          fontSize: '20px',
                          fontWeight: '600',
                          color: '#05294E',
                        },
                      },
                      '& .MuiPickersLayout-actionBar': {
                        padding: '16px 24px',
                        borderTop: '1px solid #e2e8f0',
                        '& .MuiButton-root': {
                          borderRadius: '8px',
                          padding: '10px 24px',
                          fontSize: '14px',
                          fontWeight: '600',
                          textTransform: 'none',
                          '&.MuiButton-textPrimary': {
                            color: '#6b7280',
                            '&:hover': {
                              backgroundColor: '#f3f4f6',
                            },
                          },
                          '&.MuiButton-containedPrimary': {
                            backgroundColor: '#05294E',
                            color: 'white',
                            '&:hover': {
                              backgroundColor: '#041f3d',
                            },
                          },
                        },
                      },
                      '& .MuiPickersDay-root': {
                        width: '40px',
                        height: '40px',
                        fontSize: '16px',
                        fontWeight: '500',
                        borderRadius: '8px',
                        margin: '2px',
                        '&.Mui-selected': {
                          backgroundColor: '#05294E',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: '#041f3d',
                          },
                        },
                        '&:hover': {
                          backgroundColor: '#f1f5f9',
                        },
                      },
                      '& .MuiClock-root': {
                        '& .MuiClockNumber-root': {
                          fontSize: '18px',
                          fontWeight: '500',
                          '&.Mui-selected': {
                            backgroundColor: '#05294E',
                            color: 'white',
                          },
                        },
                        '& .MuiClock-pin': {
                          backgroundColor: '#05294E',
                        },
                        '& .MuiClockPointer-thumb': {
                          backgroundColor: '#05294E',
                          border: '2px solid white',
                        },
                        '& .MuiClockPointer-line': {
                          backgroundColor: '#05294E',
                        },
                      },
                    },
                  },
                }}
              />
            </LocalizationProvider>
            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-600">
                <span className="font-medium text-slate-700">Available times:</span> Monday - Friday, 9:00 AM - 5:00 PM (1-hour intervals)
                <br />
                <span className="text-xs text-slate-500 mt-1 block">
                  Your timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </span>
              </p>
            </div>
          </div>

          {/* Submit Status Messages */}
          {submitStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-800 font-medium">{submitMessage}</p>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-800 font-medium">{submitMessage}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-[#05294E] to-[#D0151C] text-white py-4 rounded-xl font-bold text-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
          >
            {isSubmitting ? 'Scheduling...' : 'Confirm Meeting'}
          </button>

          {/* Info Text */}
          <p className="text-sm text-slate-500 text-center">
            You will receive an email confirmation within 5 minutes
          </p>
        </form>
      </div>
    </div>
  );
};

export default ForUniversitiesScheduleModal;
