# Opens Jarvis in Chrome, or Edge if Chrome is not installed, as its own app window.
# Voice input only works in those two; Opera, Opera GX and Brave cannot reach the
# speech service even though they look like they support it.
Start-Sleep -Seconds 4
$url = 'http://127.0.0.1:3217'

$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

$edge = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

$browser = if ($chrome) { $chrome } elseif ($edge) { $edge } else { $null }
if ($browser) {
  Start-Process -FilePath $browser -ArgumentList "--app=$url"
} else {
  Start-Process $url   # default browser as a last resort
}
