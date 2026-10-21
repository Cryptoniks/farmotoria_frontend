# Удаление дублей иконок в src\assets фронтенда Farmotoria.
#
# Дубль — картинка, у которой рядом лежит файл с тем же именем в более «новом» формате:
#   svg  важнее  webp  важнее  png/jpg
# Например: plants\wheat.webp и plants\wheat.png — дубли plants\wheat.svg,
#           logo.png — дубль logo.webp.
# Отдельно ищутся файлы с одинаковым содержимым (побайтовые копии).
#
# Файлы отправляются в Корзину Windows — их можно восстановить.
#
# Запуск из папки farmotoria_frontend:
#   powershell -ExecutionPolicy Bypass -File .\remove_duplicate_icons.ps1          # показать и спросить
#   powershell -ExecutionPolicy Bypass -File .\remove_duplicate_icons.ps1 -Yes     # удалить без вопроса
#   powershell -ExecutionPolicy Bypass -File .\remove_duplicate_icons.ps1 -DryRun  # только показать

param([switch]$Yes, [switch]$DryRun)

$ErrorActionPreference = "Stop"
$assets = Join-Path $PSScriptRoot "src\assets"
if (-not (Test-Path -LiteralPath $assets)) {
    Write-Error "Не найдена папка $assets. Положите скрипт в корень farmotoria_frontend."
    exit 1
}

$rank = @{ ".svg" = 3; ".webp" = 2; ".png" = 1; ".jpg" = 1; ".jpeg" = 1 }
$images = Get-ChildItem -LiteralPath $assets -Recurse -File |
    Where-Object { $rank.ContainsKey($_.Extension.ToLower()) }

$toDelete = @{}   # полный путь -> причина

# 1. Одно имя, разные форматы: оставляем самый «старший» формат
$images | Group-Object { Join-Path $_.DirectoryName $_.BaseName } | Where-Object Count -gt 1 | ForEach-Object {
    $sorted = $_.Group | Sort-Object { $rank[$_.Extension.ToLower()] } -Descending
    $keep = $sorted[0]
    $sorted | Select-Object -Skip 1 | ForEach-Object {
        $toDelete[$_.FullName] = "есть $($keep.Name)"
    }
}

# 2. Побайтовые копии с разными именами: оставляем файл с самым коротким именем
$images | Where-Object { -not $toDelete.ContainsKey($_.FullName) } |
    Group-Object { (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash } |
    Where-Object Count -gt 1 | ForEach-Object {
        $sorted = $_.Group | Sort-Object { $_.Name.Length }, Name
        $keep = $sorted[0]
        $sorted | Select-Object -Skip 1 | ForEach-Object {
            $toDelete[$_.FullName] = "копия $($keep.Name)"
        }
    }

if ($toDelete.Count -eq 0) {
    Write-Host "Дублей не найдено." -ForegroundColor Green
    exit 0
}

$total = 0
Write-Host "Найдено дублей: $($toDelete.Count)`n"
foreach ($path in ($toDelete.Keys | Sort-Object)) {
    $size = (Get-Item -LiteralPath $path).Length
    $total += $size
    $rel = $path.Substring($PSScriptRoot.Length + 1)
    Write-Host ("  {0,-45} {1,8:N0} КБ   ({2})" -f $rel, ($size / 1KB), $toDelete[$path])
}
Write-Host ("`nОсвободится: {0:N1} МБ" -f ($total / 1MB))

if ($DryRun) { exit 0 }
if (-not $Yes) {
    $answer = Read-Host "`nОтправить эти файлы в Корзину? (y/n)"
    if ($answer -notin @("y", "Y", "д", "Д", "yes", "да")) { Write-Host "Отменено."; exit 0 }
}

Add-Type -AssemblyName Microsoft.VisualBasic
foreach ($path in $toDelete.Keys) {
    [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile(
        $path,
        [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,
        [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)
}
Write-Host "`nГотово: $($toDelete.Count) файлов в Корзине." -ForegroundColor Green
