import './sidepanel.css'
import { useEffect, useRef, useState } from 'react';
import { clearMemoFromStorage, loadMemo, saveMemoToStorage } from './storage';

export default function Sidepanel() {
    const STORAGE_KEY = 'memo'
    const [memoText, setMemoText] = useState('');
    const [status, setStatus] = useState<"idle" | "typing" | "saved" | "error">("idle");
    const [isClearing, setIsClearing] = useState(false);
    const [toastText, setToastText] = useState('');
    const displayText = toastText !== '' ? toastText : status === 'idle' ? '' : status === 'typing' ? '입력 중...' : status === 'saved' ? '저장됨' : status === 'error' ? '저장 실패' : '';

    // useRef를 사용하는 이유:
    // 1. 컴포넌트가 리렌더링되어도 값이 유지됨 (일반 변수는 리렌더링 시 초기화됨)
    // 2. 값이 변경되어도 리렌더링을 트리거하지 않음 (useState와 다른 점)
    // 3. setTimeout/setInterval의 ID를 저장하기에 적합
    //    - 리렌더링 시에도 타이머 ID가 유지되어야 clearTimeout/clearInterval 가능
    //    - 타이머 ID 변경이 화면 업데이트를 유발할 필요가 없음
    // 만약 일반 변수(let)로 선언하면, 컴포넌트가 리렌더링될 때마다
    // 변수가 null로 초기화되어 이전 타이머를 clear할 수 없게 됩니다.
    const debounceTimer = useRef<number | null>(null);
    const setDefaultTimer = useRef<number | null>(null);
    const clearMemoTimer = useRef<number | null>(null);
    const toastTimer = useRef<number | null>(null);

    function showToast(text: string) {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToastText(text);
        toastTimer.current = window.setTimeout(() => {
            setToastText('');
        }, 1000);
    }

    useEffect(() => {
        loadMemo(STORAGE_KEY).then((res: string) => {
            if (res != undefined) {
                setMemoText(res);
            }
        })
    }, []);

    return (
        <div>
            <div>
                <h1 className="title">Memo</h1>
                <button id="clear" disabled={isClearing} onClick={() => {
                    if (isClearing) return;
                    setIsClearing(prev => {
                        console.log('이전 값:', prev, '→ 새 값:', true);
                        return true;
                    });
                    // console.log(isClearing) // 여전히 false
                    if (debounceTimer.current) clearTimeout(debounceTimer.current);
                    clearMemoFromStorage(STORAGE_KEY).then(() => {
                        setMemoText('')
                        showToast('초기화 완료')
                        if (setDefaultTimer.current) {
                            clearTimeout(setDefaultTimer.current);
                        }
                        setDefaultTimer.current = window.setTimeout(() => {
                            setStatus('idle')
                        }, 1000);
                        setIsClearing(false);
                    }).catch(err => {
                        if (clearMemoTimer.current) clearTimeout(clearMemoTimer.current);
                        const backupText = memoText;
                        setMemoText('');
                        clearMemoTimer.current = window.setTimeout(() => {
                            setMemoText(backupText);
                        }, 30); 
                        showToast(err.message)
                        if (setDefaultTimer.current) {
                            clearTimeout(setDefaultTimer.current);
                        }
                        setDefaultTimer.current = window.setTimeout(() => {
                            setStatus('idle')
                        }, 1000);
                        setIsClearing(false);
                    });
                }}>메모 초기화</button>
            </div>

            <textarea id="memo" placeholder="여기에 메모를 적어보세요" value={memoText} disabled={isClearing} onChange={(e) => {
                const value = e.target.value
                setMemoText(value)
                setStatus('typing')
                if (debounceTimer.current) {
                    clearTimeout(debounceTimer.current);
                }
                if (setDefaultTimer.current) { clearTimeout(setDefaultTimer.current); }
                debounceTimer.current = window.setTimeout(() => {
                    saveMemoToStorage(STORAGE_KEY, value).then(() => {
                        setStatus('saved')
                        setDefaultTimer.current = window.setTimeout(() => {
                            setStatus('idle')
                        }, 1000);
                    }).catch(err => {
                        setStatus('error')
                        setDefaultTimer.current = window.setTimeout(() => {
                            setStatus('idle')
                        }, 1000);
                    });
                }, 500);
            }
            }></textarea>

            <div className="status" id="status">{displayText}</div>
        </div>
    )
}