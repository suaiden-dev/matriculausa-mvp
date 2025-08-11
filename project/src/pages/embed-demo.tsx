import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Code, MessageCircle } from 'lucide-react';

const EmbedDemo: React.FC = () => {
  const [config, setConfig] = useState({
    agentId: '',
    agentName: 'AI Assistant',
    companyName: 'Amatricula USA',
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    position: 'bottom-right'
  });

  const [copied, setCopied] = useState(false);

  const generateEmbedCode = () => {
    const scriptUrl = `${window.location.origin}/embed.js`;
    const configJson = JSON.stringify(config, null, 2);
    
    return `<!-- Amatricula USA Chat Embed -->
<script src="${scriptUrl}"></script>
<script>
  AmatriculaChat.init(${configJson});
</script>`;
  };

  const generateIframeCode = () => {
    const params = new URLSearchParams({
      agentId: config.agentId,
      agentName: config.agentName,
      companyName: config.companyName,
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor
    });

    const embedUrl = `${window.location.origin}/embed.html?${params.toString()}`;
    
    return `<iframe 
  src="${embedUrl}"
  width="400" 
  height="600" 
  frameborder="0"
  style="border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);"
></iframe>`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testEmbed = () => {
    // Limpar qualquer embed existente
    const existingButton = document.getElementById('amatricula-chat-button');
    const existingIframe = document.getElementById('amatricula-chat-iframe');
    
    if (existingButton) existingButton.remove();
    if (existingIframe) existingIframe.remove();

    // Carregar o script de embed
    const script = document.createElement('script');
    script.src = '/embed.js';
    script.onload = () => {
      // @ts-ignore
      if (window.AmatriculaChat) {
        // @ts-ignore
        window.AmatriculaChat.init(config);
      }
    };
    document.head.appendChild(script);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Amatricula USA Chat Embed
          </h1>
          <p className="text-xl text-gray-600">
            Integre nosso chat inteligente em qualquer site
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuração */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Configuração do Embed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="agentId">Agent ID</Label>
                <Input
                  id="agentId"
                  value={config.agentId}
                  onChange={(e) => setConfig({ ...config, agentId: e.target.value })}
                  placeholder="ID do agente de IA"
                />
              </div>

              <div>
                <Label htmlFor="agentName">Nome do Bot</Label>
                <Input
                  id="agentName"
                  value={config.agentName}
                  onChange={(e) => setConfig({ ...config, agentName: e.target.value })}
                  placeholder="Nome do assistente"
                />
              </div>

              <div>
                <Label htmlFor="companyName">Nome da Empresa</Label>
                <Input
                  id="companyName"
                  value={config.companyName}
                  onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                  placeholder="Nome da sua empresa"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Cor Primária</Label>
                  <Input
                    id="primaryColor"
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="secondaryColor">Cor Secundária</Label>
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={config.secondaryColor}
                    onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="position">Posição</Label>
                <select
                  id="position"
                  value={config.position}
                  onChange={(e) => setConfig({ ...config, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Select chat position"
                >
                  <option value="bottom-right">Canto inferior direito</option>
                  <option value="bottom-left">Canto inferior esquerdo</option>
                  <option value="top-right">Canto superior direito</option>
                  <option value="top-left">Canto superior esquerdo</option>
                </select>
              </div>

              <Button onClick={testEmbed} className="w-full">
                Testar Embed
              </Button>
            </CardContent>
          </Card>

          {/* Código de Integração */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Código de Integração
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="script" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="script">Script</TabsTrigger>
                  <TabsTrigger value="iframe">Iframe</TabsTrigger>
                </TabsList>
                
                <TabsContent value="script" className="space-y-4">
                  <div className="relative">
                    <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
                      <code>{generateEmbedCode()}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(generateEmbedCode())}
                    >
                      <Copy className="w-4 h-4" />
                      {copied ? 'Copiado!' : 'Copiar'}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    Adicione este código no final do seu HTML, antes do fechamento da tag &lt;/body&gt;.
                  </p>
                </TabsContent>

                <TabsContent value="iframe" className="space-y-4">
                  <div className="relative">
                    <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
                      <code>{generateIframeCode()}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(generateIframeCode())}
                    >
                      <Copy className="w-4 h-4" />
                      {copied ? 'Copiado!' : 'Copiar'}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    Use este iframe para integrar o chat em qualquer lugar do seu site.
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Documentação */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Como Usar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-2">1</div>
                <h3 className="font-semibold mb-2">Configure</h3>
                <p className="text-sm text-gray-600">
                  Configure o nome do bot, cores e outras opções acima
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-2">2</div>
                <h3 className="font-semibold mb-2">Copie</h3>
                <p className="text-sm text-gray-600">
                  Copie o código de integração gerado
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 mb-2">3</div>
                <h3 className="font-semibold mb-2">Cole</h3>
                <p className="text-sm text-gray-600">
                  Cole o código no seu site e o chat aparecerá automaticamente
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Importante</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Certifique-se de que o Agent ID está correto</li>
                <li>• O chat será carregado automaticamente quando a página carregar</li>
                <li>• O botão flutuante aparecerá no canto da tela</li>
                <li>• Os usuários podem clicar no botão para abrir o chat</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmbedDemo; 