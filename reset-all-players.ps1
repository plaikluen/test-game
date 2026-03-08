# PowerShell script to reset all players using the resetPlayer function

# === CONFIGURATION ===
$adminSecret = "changeme1234"
$functionUrl = "https://asia-southeast1-boss-fight-8806a.cloudfunctions.net/resetPlayer"

# Read allowedPlayerIds.json
$allowedPlayerIdsPath = "allowedPlayerIds.json"
$playerIds = @()

if (Test-Path $allowedPlayerIdsPath) {
    $json = Get-Content $allowedPlayerIdsPath -Raw | ConvertFrom-Json
    $playerIds = $json.PSObject.Properties.Name
} else {
    Write-Host "allowedPlayerIds.json not found!"
    exit 1
}

foreach ($id in $playerIds) {
    Write-Host "Resetting player $id..."
    $body = @{ data = @{ playerId = $id; secret = $adminSecret } } | ConvertTo-Json
    try {
        $response = Invoke-RestMethod -Uri $functionUrl -Method Post -Body $body -ContentType "application/json"
        Write-Host "Success: $($response | ConvertTo-Json)"
    } catch {
        Write-Host ("Failed to reset " + $id + ": " + $_.Exception.Message)
    }
}
