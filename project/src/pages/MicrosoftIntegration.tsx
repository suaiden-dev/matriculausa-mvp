import React from 'react';
import MsalProviderWrapper from '../providers/MsalProvider';
import MicrosoftEmailIntegration from '../components/Microsoft/MicrosoftEmailIntegration';

export default function MicrosoftIntegrationPage() {
  return (
    <MsalProviderWrapper>
      <MicrosoftEmailIntegration />
    </MsalProviderWrapper>
  );
}
