import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, ExternalLink, Building, ArrowLeft, Sparkles, Phone, Mail, Fan as Fax } from 'lucide-react';
import { mockSchools } from '../data/mockData';

const UniversityDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const university = mockSchools.find(school => school.id === id);

  if (!university) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">University not found</h1>
          <Link to="/schools" className="text-[#05294E] hover:underline">
            Back to Universities
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            to="/schools" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-[#05294E] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Universities
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative h-80 overflow-hidden">
        <img
          src={university.image}
          alt={`${university.name} campus`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40"></div>
        
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
            <div className="text-white">
              <div className="flex items-center space-x-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  university.type === 'Private' ? 'bg-[#05294E]' : 'bg-green-600'
                }`}>
                  {university.type}
                </span>
                {university.ranking && (
                  <span className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-bold">
                    #{university.ranking} Ranked
                  </span>
                )}
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black mb-3">
                {university.name}
              </h1>
              
              <div className="flex items-center text-lg">
                <MapPin className="h-5 w-5 mr-2" />
                {university.location}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
              <p className="text-gray-600 leading-relaxed">
                {university.description}
              </p>
            </section>

            {/* Programs */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Academic Programs</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {university.programs.map((program, index) => (
                  <div 
                    key={index}
                    className="bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 text-center"
                  >
                    {program}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Information</h3>
              
              {/* Address */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Address</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>{university.address.street}</p>
                  <p>{university.address.city}, {university.address.state} {university.address.zipCode}</p>
                  <p>{university.address.country}</p>
                </div>
              </div>

              {/* Contact Details */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-3 text-[#05294E]" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Phone</div>
                    <div className="text-sm text-gray-600">{university.contact.phone}</div>
                  </div>
                </div>

                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-3 text-[#05294E]" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">General Email</div>
                    <div className="text-sm text-gray-600">{university.contact.email}</div>
                  </div>
                </div>

                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-3 text-[#D0151C]" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Admissions Email</div>
                    <div className="text-sm text-gray-600">{university.contact.admissionsEmail}</div>
                  </div>
                </div>

                {university.contact.fax && (
                  <div className="flex items-center">
                    <Fax className="h-4 w-4 mr-3 text-gray-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-700">Fax</div>
                      <div className="text-sm text-gray-600">{university.contact.fax}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Website Link */}
            <a
              href={university.website}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-[#05294E] text-white py-3 px-4 rounded-lg hover:bg-[#05294E]/90 transition-colors text-center font-medium"
            >
              <div className="flex items-center justify-center">
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit Official Website
              </div>
            </a>

            {/* Scholarships CTA */}
            <div className="bg-[#D0151C]/10 border border-[#D0151C]/20 rounded-xl p-6">
              <div className="text-center">
                <div className="bg-[#D0151C] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Scholarship Opportunities
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Discover exclusive scholarships available at {university.name}
                </p>
                <Link
                  to="/scholarships"
                  className="block bg-[#D0151C] text-white py-2 px-4 rounded-lg hover:bg-[#D0151C]/90 transition-colors text-sm font-medium"
                >
                  View Scholarships
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UniversityDetail;