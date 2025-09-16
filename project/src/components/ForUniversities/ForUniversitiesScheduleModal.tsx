import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Building2, Mail, MessageCircle, Clock } from 'lucide-react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { formatInTimeZone } from 'date-fns-tz';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ForUniversitiesScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    university_name: '',
    contact_email: '',
    preferred_date: null as Date | null,
    preferred_time: '',
    meeting_type: '',
    user_timezone: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  // Centralized timezone offset function
  const getTimezoneOffset = (timezone: string): number => {
    const timezoneOffsets: { [key: string]: number } = {
      'America/New_York': 1,      // ET (UTC-4) → Brasil (UTC-3) = +1h
      'America/Chicago': 2,        // CT (UTC-5) → Brasil (UTC-3) = +2h
      'America/Denver': 3,         // MT (UTC-6) → Brasil (UTC-3) = +3h
      'America/Los_Angeles': 4,    // PT (UTC-7) → Brasil (UTC-3) = +4h
      'America/Phoenix': 4,        // AZ (UTC-7) → Brasil (UTC-3) = +4h (4PM AZ = 8PM BR)
      'America/Anchorage': 5,      // AKT (UTC-8) → Brasil (UTC-3) = +5h
      'Pacific/Honolulu': 7,       // HST (UTC-10) → Brasil (UTC-3) = +7h
      'America/Indiana/Indianapolis': 1, // EST (UTC-4) → Brasil (UTC-3) = +1h
      'America/Detroit': 1,        // EST (UTC-4) → Brasil (UTC-3) = +1h
      'America/Boise': 3           // MST (UTC-6) → Brasil (UTC-3) = +3h
    };
    
    return timezoneOffsets[timezone] || 0;
  };

  // Centralized UTC offset function for minutes
  const getUTCOffsetMinutes = (timezone: string): number => {
    const utcOffsets: { [key: string]: number } = {
      'America/New_York': -240,      // ET (UTC-4)
      'America/Chicago': -300,       // CT (UTC-5)
      'America/Denver': -360,        // MT (UTC-6)
      'America/Los_Angeles': -420,   // PT (UTC-7)
      'America/Phoenix': -420,       // AZ (UTC-7)
      'America/Anchorage': -480,     // AKT (UTC-8)
      'Pacific/Honolulu': -600,      // HST (UTC-10)
      'America/Indiana/Indianapolis': -240, // EST (UTC-4)
      'America/Detroit': -240,       // EST (UTC-4)
      'America/Boise': -360          // MST (UTC-6)
    };
    return utcOffsets[timezone] || 0;
  };

  // Available time slots - US format (12-hour AM/PM)
  const availableTimeSlots = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'
  ];

  // Major time zones for selection - US Only
  const timeZones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona Time (AZ)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
    { value: 'America/Indiana/Indianapolis', label: 'Indiana Time (EST)' },
    { value: 'America/Detroit', label: 'Michigan Time (EST)' },
    { value: 'America/Boise', label: 'Idaho Time (MST)' }
  ].sort((a, b) => a.label.localeCompare(b.label));

  // Function to check if date is between Monday and Friday
  // getDay() returns: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
  const isWeekday = (date: Date): boolean => {
    const day = date.getDay();
    // Only allow Monday (1) through Friday (5)
    // Sunday (0) and Saturday (6) are blocked
    return day >= 1 && day <= 5;
  };

  // Function to get the next business day
  const getNextBusinessDay = (startDate: Date): Date => {
    let currentDate = new Date(startDate);
    while (!isWeekday(currentDate)) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return currentDate;
  };

  // Validate if selected time is within business hours in Brazil (13h-21h UTC-3)
  // This only checks if the time falls within our business hours, NOT if it's actually available in Google Calendar
  const isTimeValidForBusiness = (date: Date, time: string, timezone: string): boolean => {
    try {
      // Convert AM/PM time to 24-hour format for validation
      const convertTo24Hour = (timeStr: string): string => {
        const [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        
        if (period === 'PM' && hours !== 12) {
          hours += 12;
        } else if (period === 'AM' && hours === 12) {
          hours = 0;
        }
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      };
      
      const time24Hour = convertTo24Hour(time);
      
      // Create datetime in user's timezone
      const userDateTime = new Date(`${date.toISOString().split('T')[0]}T${time24Hour}:00`);
      
      // Calculate timezone offset manually for more accurate conversion
      const offset = getTimezoneOffset(timezone);
      const brazilHour = parseInt(time24Hour.split(':')[0]) + offset;
      
      
      // Check if between 13h and 21h (Brazil time)
      const isValid = brazilHour >= 13 && brazilHour <= 21;
      
      return isValid;
    } catch (error) {
      console.error('Error validating time:', error);
      return false;
    }
  };

  // Initialize default timezone when modal opens
  useEffect(() => {
    if (isOpen) {
      // Detect user's timezone automatically with fallback
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // If UTC is detected, it might be wrong - try to get a better default
      let defaultTimezone = timeZones.find(tz => tz.value === userTimezone)?.value;
      
      // If no match found or UTC detected, use a sensible default
      if (!defaultTimezone || userTimezone === 'UTC') {
        defaultTimezone = 'America/New_York'; // Sensible default for US users
      }
      
      // Initialize all default values at once
      const defaultDate = getNextBusinessDay(new Date());
      
      setFormData(prev => ({
        ...prev,
        user_timezone: defaultTimezone,
        preferred_date: defaultDate,
        preferred_time: '9:00 AM'
      }));
    }
  }, [isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePhoneChange = (value: string | undefined) => {
    setFormData(prev => ({
      ...prev,
      meeting_type: value || ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    
    if (!formData.university_name || !formData.contact_email || !formData.preferred_date || !formData.preferred_time || !formData.meeting_type || !formData.user_timezone) {
      setSubmitStatus('error');
      setSubmitMessage('Please fill in all required fields.');
      return;
    }

    // Validate business hours
    if (!isTimeValidForBusiness(formData.preferred_date, formData.preferred_time, formData.user_timezone)) {
      setSubmitStatus('error');
      setSubmitMessage('Horário não disponível. Please select another time.');
      return;
    }

    // Additional validation for weekdays
    if (formData.preferred_date && !isWeekday(formData.preferred_date)) {
      setSubmitStatus('error');
      setSubmitMessage('Please select a weekday (Monday - Friday) for your meeting.');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Convert AM/PM time to 24-hour format for payload
      const convertTo24Hour = (timeStr: string): string => {
        const [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        
        if (period === 'PM' && hours !== 12) {
          hours += 12;
        } else if (period === 'AM' && hours === 12) {
          hours = 0;
        }
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      };
      
      const time24Hour = convertTo24Hour(formData.preferred_time);
      
      // Create payload with the EXACT format the webhook expects
      const payload = {
        university_name: formData.university_name,
        contact_email: formData.contact_email,
        preferred_datetime: (() => {
          // Convert user's local time to Brazil time (UTC-3) with timezone offset
          const date = formData.preferred_date;
          const [hours, minutes] = time24Hour.split(':');
          
          // Calculate timezone offset to convert to Brazil time
          const offset = getTimezoneOffset(formData.user_timezone);
          const brazilHour = parseInt(hours) + offset;
          
          
          // Since N8N converts to UTC anyway, send UTC directly to avoid compensation
          // Convert Brazil time to UTC (Brazil UTC-3, so +3 hours)
          const utcHour = brazilHour + 3;
          const utcDate = new Date(date);
          utcDate.setHours(utcHour, parseInt(minutes), 0, 0);
          
          
          // Return UTC time to avoid N8N compensation
          return utcDate.toISOString();
        })(),
        preferred_date: formData.preferred_date.toISOString().split('T')[0], // YYYY-MM-DD
        
        // Keep preferred_time for N8N compatibility
        preferred_time: (() => {
          const [hours, minutes] = time24Hour.split(':');
          const offset = getTimezoneOffset(formData.user_timezone);
          const brazilHour = parseInt(hours) + offset;
          return `${brazilHour.toString().padStart(2, '0')}:${minutes}`;
        })(),
        
        // Simplified time field - just the Brazil time without timezone
        brazil_time: (() => {
          const [hours, minutes] = time24Hour.split(':');
          const offset = getTimezoneOffset(formData.user_timezone);
          const brazilHour = parseInt(hours) + offset;
          return `${brazilHour.toString().padStart(2, '0')}:${minutes}`;
        })(),
        
        // UTC time for N8N (to avoid compensation)
        utc_time: (() => {
          const [hours, minutes] = time24Hour.split(':');
          const offset = getTimezoneOffset(formData.user_timezone);
          const brazilHour = parseInt(hours) + offset;
          const utcHour = brazilHour + 3;
          return `${utcHour.toString().padStart(2, '0')}:${minutes}`;
        })(),
        
        // User's original timezone for reference
        user_timezone: formData.user_timezone,
        
        // Phone number - keep both fields for compatibility
        meeting_type: formData.meeting_type,  // For N8N compatibility
        phone_number: formData.meeting_type,  // For clarity
        
        // Additional fields for debugging Google Calendar behavior
        debug_datetime_utc: (() => {
          // Test: Send as UTC time for comparison
          const date = formData.preferred_date;
          const [hours, minutes] = time24Hour.split(':');
          const offset = getTimezoneOffset(formData.user_timezone);
          const brazilHour = parseInt(hours) + offset;
          
          // Convert Brazil time to UTC (Brazil UTC-3, so +3 hours)
          const utcHour = brazilHour + 3;
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${utcHour.toString().padStart(2, '0')}:${minutes}:00Z`;
        })(),
        debug_timezone_info: {
          user_timezone: formData.user_timezone,
          brazil_offset: '-03:00',
          conversion_explanation: `${formData.preferred_time} ${formData.user_timezone} → ${(() => {
            const [hours, minutes] = time24Hour.split(':');
            const offset = getTimezoneOffset(formData.user_timezone);
            const brazilHour = parseInt(hours) + offset;
            return `${brazilHour}:${minutes} Brasil`;
          })()}`
        }
      };


      // Send request to webhook
      const response = await fetch('https://nwh.suaiden.com/webhook/university-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // ✅ USAR A RESPOSTA REAL DO WEBHOOK
      if (result.response) {
        setSubmitStatus('success');
        setSubmitMessage(result.response); // Usa a mensagem do webhook
      } else {
        setSubmitStatus('success');
        setSubmitMessage('Your meeting request has been submitted successfully! We will contact you soon to confirm the details.');
      }
      
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          university_name: '',
          contact_email: '',
          preferred_date: null,
          preferred_time: '',
          meeting_type: '',
          user_timezone: ''
        });
        setSubmitStatus('idle');
        setSubmitMessage('');
      }, 5000); // 5 seconds for user to read the message
      
    } catch (error) {
      console.error('Error submitting request:', error);
      
      let errorMessage = 'An error occurred while submitting your request. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('HTTP error')) {
          errorMessage = 'Server error. Please try again later or contact support.';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        }
      }
      
      setSubmitStatus('error');
      setSubmitMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800">Schedule a Meeting</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Close modal"
            title="Close modal"
          >
            <X className="h-6 w-6 text-slate-600" />
          </button>
        </div>

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
              placeholder="Enter your university name"
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
              placeholder="Enter your contact email"
              required
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <MessageCircle className="inline h-4 w-4 mr-2" />
              Phone Number *
            </label>
            <div className="w-full px-4 py-3 border border-slate-300 rounded-xl focus-within:ring-2 focus-within:ring-[#05294E] focus-within:border-transparent transition-all">
              <PhoneInput
                placeholder="Enter phone number"
                value={formData.meeting_type}
                onChange={handlePhoneChange}
                defaultCountry="US"
                className="w-full"
                countryCallingCodeEditable={true}
                international
                required
              />
            </div>
          </div>

          {/* Time Zone Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Clock className="inline h-4 w-4 mr-2" />
              Your Time Zone *
            </label>
            
            {/* Timezone warning */}
            {formData.user_timezone === 'UTC' && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Important:</strong> UTC timezone detected. Please select your actual timezone below to ensure accurate scheduling.
                </p>
              </div>
            )}
            
            <select
              value={formData.user_timezone}
              onChange={(e) => handleInputChange('user_timezone', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent transition-all"
              required
              aria-label="Select your timezone"
              title="Select your timezone"
            >
              {timeZones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time with validation feedback */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Preferred Date *
              </label>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  value={formData.preferred_date}
                  onChange={(newDate) => handleInputChange('preferred_date', newDate)}
                  slotProps={{
                    textField: {
                      placeholder: "Select date (Monday - Friday only)",
                      className: "w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent transition-all"
                    }
                  }}
                  minDate={new Date()}
                  shouldDisableDate={(date) => !isWeekday(date)}
                  disablePast
                />
                <p className="mt-2 text-sm text-slate-500">
                  Only business days (Monday - Friday) are available for scheduling
                </p>
              </LocalizationProvider>
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Clock className="inline h-4 w-4 mr-2" />
                Preferred Time *
              </label>
              <select
                value={formData.preferred_time}
                onChange={(e) => handleInputChange('preferred_time', e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent transition-all"
                required
                aria-label="Select preferred time"
                title="Select preferred time"
              >
                {availableTimeSlots.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              
              {/* Time validation feedback */}
              {formData.preferred_date && formData.preferred_time && formData.user_timezone && (
                <div className="mt-2 text-sm">
                  {isTimeValidForBusiness(formData.preferred_date, formData.preferred_time, formData.user_timezone) ? (
                    <span className="text-green-600">Business hours valid</span>
                  ) : (
                    <span className="text-red-600">Outside business hours</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#05294E] text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-[#041f3d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Sending to webhook...' : 'Schedule Meeting'}
          </button>

          {/* Status Messages */}
          {submitStatus !== 'idle' && (
            <div className={`p-4 rounded-xl text-center ${
              submitStatus === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {submitMessage}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ForUniversitiesScheduleModal;