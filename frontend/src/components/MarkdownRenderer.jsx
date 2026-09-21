import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-zinc-800 bg-[#0a0a0c] shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/90 border-b border-zinc-800">
        <span className="text-xs font-mono text-zinc-400">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <><Check className="w-3.5 h-3.5 text-zinc-200" /><span className="text-zinc-200">Copied</span></>
          ) : (
            <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: 'transparent',
          fontSize: '0.8125rem',
          lineHeight: '1.6',
        }}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  return (
    <div className="markdown-body prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            if (!inline && match) {
              return <CodeBlock language={match[1]}>{children}</CodeBlock>;
            }
            if (!inline && String(children).includes('\n')) {
              return <CodeBlock language="">{children}</CodeBlock>;
            }
            return (
              <code className="px-1.5 py-0.5 rounded-md bg-zinc-800/80 text-zinc-200 border border-zinc-700/50 text-[0.8125rem] font-mono" {...props}>
                {children}
              </code>
            );
          },
          h1: ({ children }) => <h1 className="text-xl font-bold text-zinc-100 mt-6 mb-3 first:mt-0 tracking-tight">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-semibold text-zinc-100 mt-5 mb-2 tracking-tight">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold text-zinc-200 mt-4 mb-2">{children}</h3>,
          h4: ({ children }) => <h4 className="text-sm font-semibold text-zinc-200 mt-3 mb-1">{children}</h4>,
          p: ({ children }) => <p className="my-2 leading-relaxed text-zinc-300">{children}</p>,
          ul: ({ children }) => <ul className="my-2 ml-4 space-y-1 list-disc text-zinc-300">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 ml-4 space-y-1 list-decimal text-zinc-300">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 pl-4 border-l-2 border-zinc-500 text-zinc-400 italic">{children}</blockquote>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-white hover:text-zinc-300 underline underline-offset-4 decoration-zinc-500 hover:decoration-white font-medium">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-zinc-800">
              <table className="min-w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-zinc-900/80">{children}</thead>,
          th: ({ children }) => <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-300 border-b border-zinc-800">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 text-zinc-400 border-b border-zinc-850/60">{children}</td>,
          hr: () => <hr className="my-4 border-zinc-800" />,
          strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
          em: ({ children }) => <em className="italic text-zinc-300">{children}</em>,
          img: ({ src, alt }) => (
            <img src={src} alt={alt} className="my-3 rounded-lg max-w-full border border-zinc-800" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
