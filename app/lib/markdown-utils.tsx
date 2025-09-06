import React from 'react';

// 簡単なマークダウン解析用のユーティリティ
export function parseMarkdownToReact(text: string): React.ReactNode {
  // 空行の場合は改行を返す
  if (text.trim() === "") {
    return <br className="leading-4" />;
  }

  // 見出し（## Title）の処理
  if (text.startsWith('## ')) {
    const headingText = text.slice(3);
    return (
      <h3 className="font-bold text-foreground text-base mt-4 mb-2">
        {headingText}
      </h3>
    );
  }

  // 太字（**text**）の処理
  const processedText = text.split(/(\*\*[^*]+\*\*)/).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return <strong key={index} className="font-semibold text-foreground">{boldText}</strong>;
    }
    return part;
  });

  return <p className="mb-2 leading-relaxed">{processedText}</p>;
}

// 配列のマークダウンテキストをReactコンポーネントに変換
export function renderMarkdownArray(contentArray: string[]): React.ReactNode {
  return (
    <div className="space-y-1">
      {contentArray.map((paragraph, index) => (
        <React.Fragment key={index}>
          {parseMarkdownToReact(paragraph)}
        </React.Fragment>
      ))}
    </div>
  );
}