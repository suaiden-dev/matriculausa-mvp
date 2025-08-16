import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Building2, Mail, MessageCircle } from 'lucide-react';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ForUniversitiesScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    university_name: '',
    contact_email: '',
    preferred_date: '',
    preferred_time: '',
    meeting_type: '',
    preferred_datetime: null as Date | null
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
    
    // Skip weekends
    while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
      nextDate.setDate(nextDate.getDate() + 1);
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

  // Function to get minimum date (next business day)
  const getMinDate = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Skip weekends
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    
    return tomorrow.toISOString().split('T')[0];
  };

  // Function to check if date is weekend
  const isWeekend = (dateString: string) => {
    const date = new Date(dateString);
    return date.getDay() === 0 || date.getDay() === 6;
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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.university_name || !formData.contact_email || !formData.preferred_date || !formData.preferred_time || !formData.meeting_type) {
      setSubmitStatus('error');
      setSubmitMessage('Please fill in all required fields.');
      return;
    }

    // Additional validation for weekdays
    if (isWeekend(formData.preferred_date)) {
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

    // Additional validation for business hours
    const selectedHour = parseInt(formData.preferred_time.split(':')[0]);
    if (selectedHour < 9 || selectedHour > 17) {
      setSubmitStatus('error');
      setSubmitMessage('Please select a time between 9:00 AM and 5:00 PM (Arizona time).');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setSubmitMessage('');

    try {
      // Create a Date object from the selected date and time
      const selectedDate = new Date(formData.preferred_date);
      const [hours, minutes] = formData.preferred_time.split(':').map(Number);
      selectedDate.setHours(hours, minutes, 0, 0);

      // Convert to Eastern Time for the webhook
      const easternTime = new Date(selectedDate.toLocaleString("en-US", {timeZone: "America/New_York"}));
      
      // Extract components for the webhook payload
      const year = easternTime.getFullYear();
      const month = String(easternTime.getMonth() + 1).padStart(2, '0');
      const day = String(easternTime.getDate()).padStart(2, '0');
      const hours_eastern = String(easternTime.getHours()).padStart(2, '0');
      const minutes_eastern = String(easternTime.getMinutes()).padStart(2, '0');
      const seconds_eastern = String(easternTime.getSeconds()).padStart(2, '0');
      
      // Format: YYYY-MM-DDTHH:MM:SS (assuming Eastern Time)
      const easternDateTimeString = `${year}-${month}-${day}T${hours_eastern}:${minutes_eastern}:${seconds_eastern}`;

      // Debug: Verify if the hour is being extracted correctly
      console.log('🔍 Debug - Hour extraction:', {
        selectedTime: selectedDate,
        getHours: selectedDate.getHours(),
        hours: hours_eastern,
        minutes: minutes_eastern,
        fullDateTime: easternDateTimeString
      });

      const payload = {
        university_name: formData.university_name,
        contact_email: formData.contact_email,
        preferred_datetime: easternDateTimeString, // Selected time as Eastern Time
        preferred_date: `${year}-${month}-${day}`, // Date in YYYY-MM-DD format
        preferred_time: `${hours_eastern}:${minutes_eastern}`, // Time in HH:MM format
        timezone: 'America/New_York', // US timezone
        // Debug and validation information
        local_datetime: formData.preferred_datetime?.toLocaleString(),
        selected_hours: hours_eastern,
        selected_minutes: minutes_eastern,
        user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        utc_offset_minutes: formData.preferred_datetime?.getTimezoneOffset(),
        meeting_type: meetingTypes.find(t => t.value === formData.meeting_type)?.label || formData.meeting_type
      };

      // Debug: Log of the time being sent
      console.log('🕐 Debug - Selected time:', {
        original: formData.preferred_datetime,
        localString: formData.preferred_datetime?.toLocaleString(),
        isoString: formData.preferred_datetime?.toISOString(),
        easternDateTimeString: easternDateTimeString,
        selectedTime: selectedDate,
        selectedHours: hours_eastern,
        selectedMinutes: minutes_eastern,
        timezone: 'America/New_York',
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        utcOffsetMinutes: formData.preferred_datetime?.getTimezoneOffset(),
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
            preferred_date: '',
            preferred_time: '',
            meeting_type: '',
            preferred_datetime: null
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-[#05294E] to-[#D0151C] rounded-lg">
              <CalendarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Schedule a Meeting</h2>
              <p className="text-slate-600">Let's discuss how we can help your university</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-slate-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* University Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Building2 className="inline h-4 w-4 mr-2" />
                University Name *
              </label>
              <input
                type="text"
                value={formData.university_name}
                onChange={(e) => handleInputChange('university_name', e.target.value)}
                className="w-full h-12 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent px-3 py-2"
                placeholder="Enter university name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Mail className="inline h-4 w-4 mr-2" />
                Contact Email *
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                className="w-full h-12 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent px-3 py-2"
                placeholder="Enter contact email"
                required
              />
            </div>
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
            >
              <option value="">Select meeting type</option>
              {meetingTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Picker */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <CalendarIcon className="inline h-4 w-4 mr-2" />
                Preferred Date *
              </label>
              <input
                type="date"
                value={formData.preferred_date}
                onChange={(e) => handleInputChange('preferred_date', e.target.value)}
                min={getMinDate()}
                className="w-full h-12 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent px-3 py-2"
                required
                onBlur={(e) => {
                  if (e.target.value && isWeekend(e.target.value)) {
                    setSubmitStatus('error');
                    setSubmitMessage('Please select a weekday (Monday - Friday).');
                  } else {
                    setSubmitStatus('idle');
                    setSubmitMessage('');
                  }
                }}
              />
            </div>

            {/* Time Picker */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Preferred Time *
              </label>
              <select
                value={formData.preferred_time}
                onChange={(e) => handleInputChange('preferred_time', e.target.value)}
                className="w-full h-12 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent px-3 py-2"
                required
              >
                <option value="">Select time</option>
                {Array.from({ length: 9 }, (_, i) => {
                  const hour = i + 9; // 9 AM to 5 PM
                  const timeString = `${hour.toString().padStart(2, '0')}:00`;
                  return (
                    <option key={timeString} value={timeString}>
                      {hour === 12 ? '12:00 PM' : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            <strong>Note:</strong> Meetings are only available Monday through Friday between 9:00 AM - 5:00 PM (Arizona time). 
            This ensures suitable meeting times for both Arizona and other US universities.
          </p>

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
