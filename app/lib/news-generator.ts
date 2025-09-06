import { getAudioUrl } from "./utils";

export interface NewsItem {
  id: string;
  date: string;
  title: string;
  audioUrl: string;
  duration: string; // 表示用（例: "5:44"）
  exactDurationSeconds?: number; // シークバー用（例: 344.123）
}

// 曜日の日本語表現
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * 日付をYYYY_MM_DD形式にフォーマット
 */
function formatDateForFile(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}_${month}_${day}`;
}

/**
 * 日付を日本語形式でフォーマット
 */
function formatDateForDisplay(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAYS[date.getDay()];
  return `${year}年${month}月${day}日（${weekday}）`;
}

/**
 * Base64エンコードされた文字列をデコード
 */
function decodeBase64Japanese(base64String: string): string {
  try {
    // Base64デコード
    const binaryString = atob(base64String);
    // バイナリをUTF-8として解釈
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    // UTF-8デコード
    return new TextDecoder('utf-8').decode(bytes);
  } catch (error) {
    console.error(error)
    return '';
  }
}



/**
 * サーバーサイドAPI経由で音声ファイルのメタデータを取得（duration + title）
 */
async function getAudioMetadata(audioUrl: string): Promise<{ duration: string; exactDurationSeconds: number | undefined; title: string }> {
  try {
    // audioUrlからファイル名を抽出
    const url = new URL(audioUrl, window.location.origin);
    const filename = url.searchParams.get('filename');
    
    if (!filename) {
      return {
        duration: '再生時間不明',
        exactDurationSeconds: undefined,
        title: '音声ニュース'
      };
    }


    // メタデータAPI（duration + title統合）を取得
    const metadataResult = await fetch(`/api/audio/metadata?filename=${encodeURIComponent(filename)}`)
      .then(response => response.ok ? response.json() : null)
      .catch(error => {
        console.error(error)
        return null;
      });

    let duration: string | null = null;
    let exactDurationSeconds: number | undefined = undefined;
    let title = '';

    if (metadataResult) {
      // Duration結果の処理 - exactDurationSecondsがあれば常に使用
      if (metadataResult.exactDurationSeconds && metadataResult.exactDurationSeconds > 0) {
        const exactSeconds = metadataResult.exactDurationSeconds;
        exactDurationSeconds = exactSeconds;
        // exactDurationSecondsから正確な時間文字列を生成
        const totalSeconds = Math.floor(exactSeconds);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      } else if (metadataResult.duration) {
        // exactDurationSecondsがない場合でも、durationがあれば使用
        duration = metadataResult.duration;
      }

      // Title結果の処理（Base64デコード済みtitleから取得）
      if (metadataResult.customMetadata && metadataResult.customMetadata.title) {
        const titleValue = metadataResult.customMetadata.title;
        
        // Base64エンコードされている場合はデコード
        if (titleValue.match(/^[A-Za-z0-9+/]+=*$/)) {
          const decodedTitle = decodeBase64Japanese(titleValue);
          if (decodedTitle) {
            title = decodedTitle;
          }
        } else {
          title = titleValue;
        }
      }
    }

    // タイトルが取得できない場合のフォールバック
    if (!title) {
      const dateMatch = filename.match(/audio_(\d{4}_\d{2}_\d{2})/);
      if (dateMatch) {
        const datePart = dateMatch[1].replace(/_/g, '/');
        title = `${datePart}のニュース`;
      } else {
        title = '音声ニュース';
      }
    }

    return { 
      duration: duration || '再生時間不明', 
      exactDurationSeconds,
      title 
    };

  } catch (error) {
    console.error(error)
    
    // エラー時のフォールバック
    return {
      duration: '再生時間不明',
      exactDurationSeconds: undefined,
      title: '音声ニュース'
    };
  }
}

/**
 * 日本時間の朝5時を基準に基準日を決定
 * 5時前なら昨日、5時以降なら今日を基準とする
 */
function getBaseDate(): Date {
  const now = new Date();
  
  // 日本時間を取得（タイムゾーン指定でより確実）
  const japanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
  
  // 日本時間の朝5時より前なら昨日を基準にする
  // これにより朝5時前は「昨日のニュース」が最新として表示される
  if (japanTime.getHours() < 5) {
    japanTime.setDate(japanTime.getDate() - 1);
  }
  
  return japanTime;
}

/**
 * 過去1週間のニュースデータを生成
 * 日本時間朝5時を境界として基準日を決定
 */
export async function generateNewsData(): Promise<NewsItem[]> {
  const newsData: NewsItem[] = [];
  const baseDate = getBaseDate();
  
  // 音声メタデータ取得を並列実行するためのPromise配列
  const metadataPromises: Promise<{ index: number; duration: string; exactDurationSeconds: number | undefined; title: string }>[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() - i);
    
    const dateForFile = formatDateForFile(date);
    const dateForDisplay = formatDateForDisplay(date);
    const audioUrl = getAudioUrl(`audio_${dateForFile}.mp3`);
    
    
    // 基本データを先に作成（duration, titleは後で設定）
    newsData.push({
      id: (i + 1).toString(),
      date: dateForDisplay,
      title: "読み込み中...",
      audioUrl,
      duration: "読み込み中..."
    });
    
    // 音声メタデータ取得のPromiseを作成
    metadataPromises.push(
      getAudioMetadata(audioUrl)
        .then(metadata => ({ index: i, ...metadata }))
        .catch((error) => {
          console.error(error)
          // フォールバック
          return { 
            index: i, 
            duration: '再生時間不明',
            exactDurationSeconds: undefined,
            title: `${dateForDisplay}のニュース`
          };
        })
    );
  }
  
  // 全ての音声メタデータ取得を並列実行
  try {
    const results = await Promise.allSettled(metadataPromises);
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { index: dataIndex, duration, exactDurationSeconds, title } = result.value;
        if (newsData[dataIndex]) {
          newsData[dataIndex].duration = duration;
          newsData[dataIndex].exactDurationSeconds = exactDurationSeconds;
          newsData[dataIndex].title = title;
        }
      }
    });
  } catch (error) {
    console.error(error)
  }
  
  return newsData;
}