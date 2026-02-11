import React, { useState, useRef } from "react";
import "./App.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

function App() {
  const [url, setUrl] = useState("");
  const [queue, setQueue] = useState<string[]>([]);
  const [results, setResults] = useState<
    { url: string; transcription: string; file: string }[]
  >([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const queueRef = useRef<string[]>([]);

  // キューに追加
  const handleAddToQueue = () => {
    /* istanbul ignore next */
    if (!url) return;
    setQueue((q) => {
      const newQueue = [...q, url];
      queueRef.current = newQueue;
      return newQueue;
    });
    setUrl("");
  };

  // キュー処理
  React.useEffect(() => {
    if (processing || queue.length === 0) return;
    const processNext = async () => {
      setProcessing(true);
      setError("");
      const currentUrl = queue[0];
      try {
        `${API_BASE_URL}/api/convert`;
        // 変換
        const res1 = await fetch("http://localhost:3001/api/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: currentUrl }),
        });
        const data1 = await res1.json();
        if (!res1.ok) throw new Error(data1.error || "変換に失敗しました");
        // 書き起こし
        const res2 = await fetch(`${API_BASE_URL}/api/transcribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: data1.filename }),
        });
        const data2 = await res2.json();
        if (!res2.ok)
          throw new Error(data2.error || "書き起こしに失敗しました");
        setResults((r) => [
          ...r,
          {
            url: currentUrl,
            transcription: data2.text,
            file: data2.transcriptionFile,
          },
        ]);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setQueue((q) => {
          const newQueue = q.slice(1);
          queueRef.current = newQueue;
          return newQueue;
        });
        setProcessing(false);
      }
    };
    processNext();
    // eslint-disable-next-line
  }, [queue, processing]);

  const handleDownload = (file: string) => {
    window.open(`${API_BASE_URL}/api/download/${file}`);
  };

  return (
    <div className="App">
      <h1>YouTube書き起こしツール</h1>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="YouTubeのURLを入力"
        style={{ width: "60%" }}
        disabled={false}
      />
      <button
        onClick={handleAddToQueue}
        disabled={!url}
        style={{ marginLeft: 8 }}
      >
        キューに追加
      </button>
      {processing && <p>処理中...（残り{queue.length}件）</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div style={{ marginTop: 24 }}>
        <h2>書き起こし結果</h2>
        {results.map((r, i) => (
          <div
            key={i}
            style={{ marginBottom: 24, border: "1px solid #ccc", padding: 12 }}
          >
            <div>
              <b>URL:</b> {r.url}
            </div>
            <button
              onClick={() => handleDownload(r.file)}
              style={{ marginTop: 8 }}
            >
              テキストをダウンロード
            </button>
          </div>
        ))}
      </div>
      {queue.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3>キュー待ちURL</h3>
          <ul>
            {queue.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
