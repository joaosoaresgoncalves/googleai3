
import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Loader2, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Table,
  BookOpen,
  GitMerge,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { ArticleAnalysis, SynthesisReport, ProcessStatus } from './types.ts';
import { analyzeArticle, generateFinalSynthesis } from './services/geminiService.ts';

const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [report, setReport] = useState<SynthesisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'individual' | 'matrix' | 'synthesis'>('individual');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
      if (newFiles.length + files.length > 20) {
        alert("Limite máximo de 20 arquivos permitido.");
        return;
      }
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startProcessing = async () => {
    if (files.length === 0) return;
    
    setStatus(ProcessStatus.EXTRACTING);
    setError(null);
    setReport(null);
    setProgress({ current: 0, total: files.length });

    const individualAnalyses: ArticleAnalysis[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(p => ({ ...p, current: i + 1 }));
        const analysis = await analyzeArticle(files[i]);
        individualAnalyses.push(analysis);
      }

      setStatus(ProcessStatus.SYNTHESIZING);
      const synthesisData = await generateFinalSynthesis(individualAnalyses);

      setReport({
        analyses: individualAnalyses,
        matrixMarkdown: synthesisData.matrix,
        narrativeSynthesis: synthesisData.narrative,
        conflicts: synthesisData.conflicts
      });
      setStatus(ProcessStatus.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setError("Ocorreu um erro durante o processamento. Verifique sua chave de API ou a integridade dos arquivos.");
      setStatus(ProcessStatus.ERROR);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    
    let content = `# Relatório de Síntese de Evidências Acadêmicas\n\n`;
    content += `## 1. Matriz de Síntese\n\n${report.matrixMarkdown}\n\n`;
    content += `## 2. Síntese Narrativa\n\n${report.narrativeSynthesis}\n\n`;
    content += `## 3. Conflitos e Divergências\n\n${report.conflicts}\n\n`;
    content += `## 4. Análises Individuais\n\n`;
    
    report.analyses.forEach((a, i) => {
      content += `### Artigo ${i + 1}: ${a.title}\n`;
      content += `**Autores:** ${a.authors} (${a.year})\n`;
      content += `**Problema:** ${a.problem}\n`;
      content += `**Metodologia:** ${a.methodology}\n`;
      content += `**Achados:** ${a.findings}\n`;
      content += `**Crítica:** ${a.critique}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sintese_academica_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderMarkdownTable = (md: string) => {
    const rows = md.trim().split('\n').filter(r => r.includes('|') && !r.includes('---'));
    if (rows.length < 2) return `<p class="italic text-slate-400">Tabela não disponível.</p>`;

    const header = rows[0].split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
    const body = rows.slice(1).map(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-slate-900 text-white py-8 px-6 shadow-lg border-b-4 border-blue-600">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-8 h-8 text-blue-400" />
              <h1 className="text-3xl font-bold academic-serif">Acadêmico IA</h1>
            </div>
            <p className="text-slate-400 max-w-2xl">
              Especialista em Síntese de Evidências: Processamento sistemático e rigoroso de literatura científica.
            </p>
          </div>
          {status === ProcessStatus.COMPLETED && (
            <button 
              onClick={downloadReport}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all shadow-md active:scale-95"
            >
              <Download className="w-5 h-5" />
              Exportar Relatório (.md)
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto mt-10 px-6">
        {status === ProcessStatus.IDLE || status === ProcessStatus.ERROR ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Upload de Documentos (PDF)
              </h2>
              <p className="text-slate-600 mb-6">
                Selecione de 1 a 20 artigos acadêmicos para iniciar a análise sistemática. 
                Os arquivos serão processados individualmente e depois sintetizados.
              </p>
              
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-12 h-12 text-slate-400 group-hover:text-blue-500 mb-4 transition-colors" />
                  <p className="mb-2 text-sm text-slate-500 font-medium">Clique para selecionar ou arraste e solte</p>
                  <p className="text-xs text-slate-400">Apenas arquivos PDF (Máx. 20)</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  multiple 
                  accept=".pdf" 
                  onChange={handleFileChange} 
                />
              </label>
            </div>

            {files.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Arquivos Selecionados ({files.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <span className="text-sm truncate font-medium text-slate-700">{file.name}</span>
                      </div>
                      <button 
                        onClick={() => removeFile(idx)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <button
              onClick={startProcessing}
              disabled={files.length === 0}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2
                ${files.length > 0 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              Iniciar Análise Sistemática
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        ) : status === ProcessStatus.EXTRACTING || status === ProcessStatus.SYNTHESIZING ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center border border-slate-200">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <Loader2 className="w-20 h-20 text-blue-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600">
                    {status === ProcessStatus.EXTRACTING ? `${progress.current}/${progress.total}` : 'AI'}
                  </span>
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-slate-800">
              {status === ProcessStatus.EXTRACTING ? 'Extraindo evidências acadêmicas...' : 'Gerando síntese sistemática...'}
            </h2>
            <p className="text-slate-500 max-w-md mx-auto mb-8">
              {status === ProcessStatus.EXTRACTING 
                ? `Estamos lendo e analisando minuciosamente o artigo ${progress.current} de ${progress.total}.` 
                : 'Consolidando achados, identificando padrões e divergências teóricas entre todos os artigos.'}
            </p>
            <div className="w-full bg-slate-100 rounded-full h-3 max-w-lg mx-auto overflow-hidden">
              <div 
                className="bg-blue-600 h-full transition-all duration-500 ease-out"
                style={{ width: `${status === ProcessStatus.EXTRACTING ? (progress.current / progress.total) * 100 : 95}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
              <button 
                onClick={() => setActiveTab('individual')}
                className={`px-6 py-4 flex items-center gap-2 font-semibold text-sm transition-all border-b-2 whitespace-nowrap
                  ${activeTab === 'individual' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <FileText className="w-4 h-4" />
                Análises Individuais
              </button>
              <button 
                onClick={() => setActiveTab('matrix')}
                className={`px-6 py-4 flex items-center gap-2 font-semibold text-sm transition-all border-b-2 whitespace-nowrap
                  ${activeTab === 'matrix' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <Table className="w-4 h-4" />
                Matriz de Síntese
              </button>
              <button 
                onClick={() => setActiveTab('synthesis')}
                className={`px-6 py-4 flex items-center gap-2 font-semibold text-sm transition-all border-b-2 whitespace-nowrap
                  ${activeTab === 'synthesis' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <GitMerge className="w-4 h-4" />
                Síntese Narrativa & Conflitos
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
              {activeTab === 'individual' && (
                <div className="space-y-12">
                  {report?.analyses.map((analysis, idx) => (
                    <article key={analysis.id} className="pb-12 border-b border-slate-100 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded">Artigo {idx + 1}</span>
                          <h3 className="text-2xl font-bold mt-2 academic-serif text-slate-900 leading-tight">{analysis.title}</h3>
                          <div className="flex flex-wrap gap-4 mt-3 text-slate-500 text-sm font-medium">
                            <span className="flex items-center gap-1">👤 {analysis.authors}</span>
                            <span className="flex items-center gap-1">📅 {analysis.year}</span>
                            <span className="flex items-center gap-1 italic opacity-75">📄 {analysis.filename}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                        <section>
                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Problema / Lacuna</h4>
                          <p className="text-slate-700 leading-relaxed text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">{analysis.problem}</p>
                        </section>
                        <section>
                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Metodologia</h4>
                          <p className="text-slate-700 leading-relaxed text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">{analysis.methodology}</p>
                        </section>
                        <section className="lg:col-span-2">
                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Achados Principais</h4>
                          <p className="text-slate-700 leading-relaxed text-sm bg-blue-50 p-6 rounded-xl border border-blue-100">{analysis.findings}</p>
                        </section>
                        <section className="lg:col-span-2">
                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Crítica Técnica</h4>
                          <div className="flex gap-4 items-start bg-slate-900 text-slate-200 p-6 rounded-xl">
                            <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                            <p className="italic leading-relaxed text-sm">{analysis.critique}</p>
                          </div>
                        </section>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {activeTab === 'matrix' && report && (
                <div className="overflow-x-auto overflow-y-hidden">
                  <div className="prose prose-slate max-w-none">
                    <style>{`
                      table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
                      th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left; padding: 1rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
                      td { padding: 1rem; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: top; line-height: 1.5; }
                      tr:hover td { background: #f8fafc; }
                    `}</style>
                    <div dangerouslySetInnerHTML={{ 
                      __html: renderMarkdownTable(report.matrixMarkdown) 
                    }} />
                  </div>
                </div>
              )}

              {activeTab === 'synthesis' && report && (
                <div className="space-y-12">
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <GitMerge className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-2xl font-bold academic-serif text-slate-900">Síntese Narrativa</h3>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 leading-relaxed text-slate-700 academic-serif text-lg">
                      {report.narrativeSynthesis.split('\n').map((line, i) => (
                        <p key={i} className="mb-4 last:mb-0">{line}</p>
                      ))}
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-orange-100 p-2 rounded-lg">
                        <AlertCircle className="w-6 h-6 text-orange-600" />
                      </div>
                      <h3 className="text-2xl font-bold academic-serif text-slate-900">Conflitos e Divergências</h3>
                    </div>
                    <div className="bg-orange-50 p-8 rounded-2xl border border-orange-100 leading-relaxed text-slate-700">
                       {report.conflicts.split('\n').map((line, i) => (
                        <p key={i} className="mb-4 last:mb-0">{line}</p>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </div>

            <div className="flex justify-center mt-12">
               <button 
                onClick={() => { setFiles([]); setStatus(ProcessStatus.IDLE); setReport(null); }}
                className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Limpar tudo e iniciar nova síntese
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-20 border-t border-slate-200 py-10 px-6 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} Acadêmico IA - Desenvolvido com Gemini Pro API</p>
        <p className="mt-2 italic">Lembre-se: Esta ferramenta é assistencial. Sempre valide as interpretações da IA com os textos originais.</p>
      </footer>
    </div>
  );
};

export default App;
