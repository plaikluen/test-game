param(
  [Parameter(Mandatory = $true)]
  [string]$PlayerId,

  [string]$ProjectId = "boss-fight-8806a"
)

if ($PlayerId -notmatch "^\d{6}$") {
  throw "PlayerId must be exactly 6 digits."
}

$nodePath = "C:\Program Files\nodejs"
if (Test-Path $nodePath) {
  $env:Path = "$nodePath;$env:Path"
}

$firebaseCmd = Join-Path $env:APPDATA "npm\firebase.cmd"
if (-not (Test-Path $firebaseCmd)) {
  $firebaseCmd = "firebase"
}

$path = "/allowedPlayerIds/$PlayerId"
$targetEmail = "$PlayerId@player.local"

Write-Host "[1/4] Reading DB entry: $path"
$entryJson = & $firebaseCmd database:get $path --project $ProjectId

$entryMap = @{}
if ($entryJson -and $entryJson.Trim() -ne "null") {
  $entryObj = $entryJson | ConvertFrom-Json
  $entryObj.PSObject.Properties | ForEach-Object {
    $entryMap[$_.Name] = $_.Value
  }
}

$entryMap["used"] = $false
$entryMap["usedAt"] = $null
$payload = $entryMap | ConvertTo-Json -Compress

Write-Host "[2/4] Resetting DB flag (used=false)"
& $firebaseCmd database:set $path $payload --project $ProjectId | Out-Null

Write-Host "[3/4] Deleting auth user by uid (if exists): $PlayerId"
& $firebaseCmd auth:delete $PlayerId --project $ProjectId 2>$null | Out-Null

Write-Host "[4/4] Cleaning old auth user by email (if exists): $targetEmail"
$tempFile = Join-Path $env:TEMP ("firebase-users-" + $ProjectId + ".json")
& $firebaseCmd auth:export $tempFile --format=json --project $ProjectId | Out-Null
$users = (Get-Content $tempFile -Raw | ConvertFrom-Json).users
if ($users) {
  foreach ($u in $users) {
    if ($u.email -eq $targetEmail -and $u.localId -ne $PlayerId) {
      & $firebaseCmd auth:delete $u.localId --project $ProjectId 2>$null | Out-Null
    }
  }
}
Remove-Item $tempFile -ErrorAction SilentlyContinue

Write-Host "Done. Player $PlayerId was reset."