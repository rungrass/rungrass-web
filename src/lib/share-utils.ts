/**
 * iOS 디바이스 감지
 * iPhone, iPad, iPod를 감지합니다.
 * @returns iOS 디바이스 여부
 */
export function isIOS(): boolean {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

/**
 * Clipboard API를 사용하여 이미지를 클립보드에 복사
 * @param blob - 복사할 이미지 Blob
 * @returns 복사 성공 여부
 */
export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  try {
    // Clipboard API 지원 확인
    if (!navigator.clipboard || !navigator.clipboard.write) {
      console.log("Clipboard API not supported");
      return false;
    }

    // ClipboardItem 생성
    const clipboardItem = new ClipboardItem({
      [blob.type]: blob,
    });

    // 클립보드에 쓰기
    await navigator.clipboard.write([clipboardItem]);

    console.log("Image copied to clipboard successfully");
    return true;
  } catch (error) {
    console.error("Failed to copy image to clipboard:", error);
    return false;
  }
}
