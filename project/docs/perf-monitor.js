/**
 * 🚀 MatriculaUSA - Admin Performance Monitor
 * Copie e cole este script no console do navegador ANTES de recarregar a página.
 * Ele vai interceptar as chamadas e medir o tempo de carregamento automaticamente.
 */

(function() {
  console.clear();
  console.log("%c🚀 Monitor de Performance Ativado...", "color: #007bff; font-weight: bold; font-size: 14px;");

  const metrics = {
    fetchCount: 0,
    supabaseRequests: 0,
    lcp: 0,
    startTime: performance.now(),
    loadTime: 0
  };

  // 1. Interceptar Fetch (Queries Supabase)
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    metrics.fetchCount++;
    const url = args[0]?.toString() || "";
    if (url.includes("supabase.co")) {
      metrics.supabaseRequests++;
    }
    return originalFetch(...args);
  };

  // 2. Medir LCP (Largest Contentful Paint)
  new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      metrics.lcp = entry.startTime;
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });

  // 3. Medir Tempo de Carregamento Total
  window.addEventListener('load', () => {
    metrics.loadTime = performance.now() - metrics.startTime;
    
    setTimeout(() => {
      console.log("\n%c--- 📊 BENCHMARK ATUAL ---", "color: #ffc107; font-weight: bold; font-size: 12px;");
      console.table({
        "LCP (ms)": Math.round(metrics.lcp),
        "Queries Supabase": metrics.supabaseRequests,
        "Total Fetch": metrics.fetchCount,
        "Tempo de Load (ms)": Math.round(metrics.loadTime)
      });
      
      console.log("%c💡 Use esses valores para preencher o 'Antes' no docs/TESTES_PERFORMANCE_ADMIN.md", "color: #28a745; font-style: italic;");
    }, 2000); // Aguarda 2s após load para garantir que queries iniciais terminaram
  });
})();
