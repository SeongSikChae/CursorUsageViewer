import { useRef, useState } from 'react'
import { FileSpreadsheet, FolderUp, LoaderCircle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MAX_FILE_SIZE = 100 * 1024 * 1024

interface CsvUploadProps {
  onFile: (file: File) => Promise<void>
  fileName: string | null
  isLoading: boolean
}

export function CsvUpload({ onFile, fileName, isLoading }: CsvUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const openFileDialog = () => fileInputRef.current?.click()

  const handleFile = async (file?: File) => {
    if (!file) return
    setLocalError(null)
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      setLocalError('CSV 파일만 업로드할 수 있습니다.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setLocalError('파일 크기는 100MB 이하여야 합니다.')
      return
    }
    await onFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div
      className="drop-zone rounded-2xl border border-dashed border-[#d5d7e4] bg-white/70 px-5 py-6 sm:px-6"
      data-dragging={dragging}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        void handleFile(event.dataTransfer.files[0])
      }}
    >
      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept=".csv,text/csv,application/vnd.ms-excel"
        aria-label="Cursor 사용량 CSV 파일 선택"
        onChange={(event) => void handleFile(event.currentTarget.files?.[0])}
      />
      <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#f0efff] text-[#595bca]">
            {isLoading ? <LoaderCircle className="size-5 animate-spin" /> : <FileSpreadsheet className="size-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-[#30364b]">사용량 CSV 불러오기</h2>
              <span className="rounded-full bg-[#f2f3f8] px-2 py-0.5 text-[10px] font-medium text-[#7d8296]">최대 100MB</span>
            </div>
            <p className="mt-1 max-w-[520px] truncate text-xs text-[#8b90a2]">
              {fileName ? <><span className="font-medium text-[#5b6075]">{fileName}</span> · 다른 파일로 교체할 수 있습니다.</> : 'CSV 파일을 끌어다 놓거나 찾아보기로 선택하세요.'}
            </p>
          </div>
        </div>
        <div className="flex w-full shrink-0 flex-wrap items-center justify-center gap-3 sm:w-auto sm:justify-end">
          <span className="flex items-center gap-1.5 text-[11px] text-[#8a90a2]"><ShieldCheck className="size-3.5 text-[#27a686]" />파일은 이 기기에서만 처리됩니다</span>
          <Button onClick={openFileDialog} disabled={isLoading} className="h-9 rounded-lg px-3.5 text-xs">
            {isLoading ? <LoaderCircle className="size-3.5 animate-spin" /> : <FolderUp className="size-3.5" />}
            {fileName ? 'CSV 교체' : 'CSV 선택'}
          </Button>
        </div>
      </div>
      {localError && <p className="mt-3 text-xs font-medium text-destructive" role="alert">{localError}</p>}
      {fileName && <p className="mt-3 flex items-center gap-1.5 text-[10px] text-[#a0a4b2]"><ShieldCheck className="size-3 text-[#2eab8b]" />파일 내용은 업로드되거나 영구 저장되지 않습니다.</p>}
    </div>
  )
}
