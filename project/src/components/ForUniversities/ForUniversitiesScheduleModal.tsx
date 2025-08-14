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

  // Debug: Monitor state changes
  useEffect(() => {
    console.log('State updated - submitStatus:', submitStatus, 'submitMessage:', submitMessage);
  }, [submitStatus, submitMessage]);

  // Meeting types
  const meetingTypes = [
    { value: 'demo', label: 'Platform Demonstration' },
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

  // Function to check if time is within business hours (9 AM - 5 PM Arizona time)
  const isBusinessHours = (date: Date) => {
    // Convert to Arizona time (MST - UTC-7)
    const arizonaTime = new Date(date.getTime() - (7 * 60 * 60 * 1000));
    const hour = arizonaTime.getUTCHours();
    return hour >= 9 && hour <= 17; // 9 AM to 5 PM
  };

  // Function to get next available business hour
  const getNextBusinessHour = (date: Date) => {
    let nextDate = new Date(date);
    
    // If it's weekend, move to next Monday
    if (!isWeekday(nextDate)) {
      nextDate = getNextWeekday(nextDate);
    }
    
    // Set to 9 AM Arizona time (4 PM UTC)
    nextDate.setUTCHours(16, 0, 0, 0);
    
    return nextDate;
  };

  // Function to validate business hours for the selected date
  const validateBusinessHours = (date: Date) => {
    if (!isWeekday(date)) {
      return false;
    }
    
    // Check if time is within business hours
    return isBusinessHours(date);
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
      setSubmitMessage('Please select a time between 9:00 AM and 5:00 PM (Arizona time).');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const payload = {
        university_name: formData.university_name,
        contact_email: formData.contact_email,
        preferred_date: formData.preferred_datetime.toISOString().split('T')[0],
        preferred_time: formData.preferred_datetime.toTimeString().split(' ')[0].substring(0, 5),
        meeting_type: meetingTypes.find(t => t.value === formData.meeting_type)?.label || formData.meeting_type
      };

      const response = await fetch('https://nwh.suaiden.com/webhook/university-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log('Webhook response:', result); // Debug log

      // Simplified logic to handle the response
      const responseText = result.response || '';
      const isBusy = responseText.toLowerCase().includes('busy') || responseText.toLowerCase().includes('occupied');
      const isSuccess = responseText.toLowerCase().includes('success') || result.success === true;
      const hasResponse = result.response && result.response.trim() !== '';
      
      console.log('Response analysis:', { responseText, isBusy, isSuccess, hasResponse }); // Debug log

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
      console.error('Error details:', error); // Debug log
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
              Preferred Date & Time * (Monday - Friday, 9:00 AM - 5:00 PM Arizona time)
            </label>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                value={formData.preferred_datetime}
                onChange={(newValue) => {
                  if (newValue && validateBusinessHours(newValue)) {
                    handleInputChange('preferred_datetime', newValue);
                  } else if (newValue) {
                    // If invalid time is selected, automatically adjust to next valid business hour
                    const nextValidTime = getNextBusinessHour(newValue);
                    handleInputChange('preferred_datetime', nextValidTime);
                  }
                }}
                minDateTime={getNextBusinessHour(new Date())}
                shouldDisableDate={(date) => !isWeekday(date)}
                shouldDisableTime={(value, view) => {
                  if (view === 'hours') {
                    // Disable hours outside business hours (9 AM - 5 PM Arizona time)
                    const arizonaTime = new Date(value.getTime() - (7 * 60 * 60 * 1000));
                    const hour = arizonaTime.getUTCHours();
                    return hour < 9 || hour > 17;
                  }
                  return false;
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: 'outlined',
                    className: 'w-full',
                    helperText: 'Only weekdays (Monday - Friday) between 9:00 AM - 5:00 PM (Arizona time)',
                    sx: {
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        height: '48px',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#05294E',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#05294E',
                          borderWidth: '2px',
                        },
                      },
                    },
                  },
                }}
              />
            </LocalizationProvider>
            <p className="text-sm text-slate-500 mt-2">
              <strong>Note:</strong> Meetings are only available Monday through Friday between 9:00 AM - 5:00 PM (Arizona time). 
              This ensures suitable meeting times for both Arizona and other US universities.
            </p>
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
