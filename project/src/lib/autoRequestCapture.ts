/**
 * Auto Request Capture (DEV only)
 *
 * Captura automaticamente as requisições Supabase usando Performance API
 * durante os primeiros segundos do carregamento, sem precisar de UI/ações.
 * Publica os dados em window.__supabaseRequests e loga um resumo no console.
 */

import { readAllSupabaseRequests } from './performanceNetworkReader';

type AnyRecord = Record<string, any>;

declare global {
	interface Window {
		__supabaseRequests?: AnyRecord[];
		__supabaseRequestsStop?: () => void;
	}
}

function groupBy<T>(items: T[], keyFn: (i: T) => string) {
	const map = new Map<string, T[]>();
	for (const item of items) {
		const k = keyFn(item);
		map.set(k, [...(map.get(k) || []), item]);
	}
	return map;
}

function logSummary(requests: AnyRecord[]) {
	const total = requests.length;
	const totalTime = requests.reduce((acc, r) => acc + (r.duration || 0), 0);

	const byOperation = Array.from(groupBy(requests, r => r.operation || 'unknown').entries())
		.map(([op, arr]) => ({ operation: op, count: arr.length }))
		.sort((a, b) => b.count - a.count);

	const byFunction = Array.from(groupBy(requests, r => r.function || '—').entries())
		.map(([fn, arr]) => ({ function: fn, count: arr.length }))
		.filter(x => x.function !== '—')
		.sort((a, b) => b.count - a.count)
		.slice(0, 10);

	const byTable = Array.from(groupBy(requests, r => r.table || '—').entries())
		.map(([tb, arr]) => ({ table: tb, count: arr.length }))
		.filter(x => x.table !== '—')
		.sort((a, b) => b.count - a.count)
		.slice(0, 10);

	// Logs enxutos
	console.log('✅ [AutoRequestCapture] Captura concluída');
	console.log(`📦 Total: ${total} | ⏱️ Tempo total: ${Math.round(totalTime)}ms`);
	if (byOperation.length) console.table(byOperation);
	if (byFunction.length) {
		console.log('🔧 Top RPC');
		console.table(byFunction);
	}
	if (byTable.length) {
		console.log('🗃️ Top Tabelas');
		console.table(byTable);
	}
}

function startAutoCapture() {
	// Não duplicar
	if (typeof window === 'undefined') return;
	if ((window as any).__autoRequestCaptureStarted) return;
	(Object.assign(window as any, { __autoRequestCaptureStarted: true }));

	console.log('🔍 [AutoRequestCapture] Iniciando captura automática (DEV)');
	const seen = new Set<string>();
	window.__supabaseRequests = [];

	const tick = () => {
		const batch = readAllSupabaseRequests();
		for (const req of batch) {
			const id = `${req.timestamp}-${req.url}`;
			if (seen.has(id)) continue;
			seen.add(id);
			window.__supabaseRequests!.push(req);
		}
	};

	// Capturar por 10s pós-carregamento
	tick();
	const interval = window.setInterval(tick, 100);
	const timeout = window.setTimeout(() => {
		clearInterval(interval);
		logSummary(window.__supabaseRequests || []);
	}, 10000);

	window.__supabaseRequestsStop = () => {
		clearInterval(interval);
		clearTimeout(timeout);
		console.log('⏹️ [AutoRequestCapture] Parado');
	};
}

// Ativar somente em DEV
if (import.meta && (import.meta as any).env && (import.meta as any).env.DEV) {
	startAutoCapture();
}
