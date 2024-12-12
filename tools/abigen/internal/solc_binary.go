package internal

import (
    "encoding/json"
    "fmt"
    "io"
    "log"
    "net/http"
    "os"
    "path/filepath"
    "crypto/sha256"
    "encoding/hex"
    "strings"
)

type SolcBinary struct {
    Path     string   `json:"path"`
    Version  string   `json:"version"`
    Sha256   string   `json:"sha256"`
}

type SolcList struct {
    Builds []SolcBinary `json:"builds"`
}

func GetSolcBinary(version string) (string, error) {
    cacheDir := filepath.Join(os.Getenv("HOME"), ".cache", "solc")
    if err := os.MkdirAll(cacheDir, 0700); err != nil {
        return "", fmt.Errorf("failed to create cache directory: %w", err)
    }

    binaryPath := filepath.Join(cacheDir, fmt.Sprintf("solc-%s", version))
    if _, err := os.Stat(binaryPath); err == nil {
        return binaryPath, nil
    }

    platform := "macosx-amd64"
    if IsAppleSilicon() {
        platform = "macosx-arm64"
    }

    if !isValidSolcVersion(version) || !isValidPlatform(platform) {
        return "", fmt.Errorf("invalid solc version or platform")
    }

    listURL := fmt.Sprintf("https://binaries.soliditylang.org/%s/list.json", platform)
    resp, err := http.Get(listURL)
    if err != nil {
        return "", fmt.Errorf("failed to download solc list: %w", err)
    }
    defer func() {
        if closeErr := resp.Body.Close(); closeErr != nil {
            log.Printf("Failed to close response body: %v", closeErr)
        }
    }()

    var list SolcList
    if err := json.NewDecoder(resp.Body).Decode(&list); err != nil {
        return "", fmt.Errorf("failed to decode solc list: %w", err)
    }

    var binary *SolcBinary
    for _, b := range list.Builds {
        if b.Version == version {
            binary = &b
            break
        }
    }
    if binary == nil {
        return "", fmt.Errorf("version %s not found", version)
    }

    binaryURL := fmt.Sprintf("https://binaries.soliditylang.org/%s/%s", platform, binary.Path)
    if err := downloadAndVerify(binaryURL, binaryPath, binary.Sha256); err != nil {
        return "", fmt.Errorf("failed to download solc binary: %w", err)
    }

    if err := os.Chmod(binaryPath, 0700); err != nil {
        return "", fmt.Errorf("failed to set binary permissions: %w", err)
    }

    return binaryPath, nil
}

func downloadAndVerify(url, dest, expectedHash string) error {
    resp, err := http.Get(url)
    if err != nil {
        return fmt.Errorf("failed to download binary: %w", err)
    }
    defer func() {
        if closeErr := resp.Body.Close(); closeErr != nil {
            log.Printf("Failed to close response body: %v", closeErr)
        }
    }()

    f, err := os.OpenFile(dest, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
    if err != nil {
        return fmt.Errorf("failed to create file: %w", err)
    }
    defer func() {
        if closeErr := f.Close(); closeErr != nil {
            log.Printf("Failed to close file: %v", closeErr)
        }
    }()

    h := sha256.New()
    if _, err := io.Copy(io.MultiWriter(f, h), resp.Body); err != nil {
        return fmt.Errorf("failed to write file: %w", err)
    }

    actualHash := "0x" + hex.EncodeToString(h.Sum(nil))
    if actualHash != expectedHash {
        if err := os.Remove(dest); err != nil {
            log.Printf("Failed to remove invalid binary: %v", err)
        }
        return fmt.Errorf("hash mismatch: expected %s, got %s", expectedHash, actualHash)
    }

    return nil
}

func isValidSolcVersion(version string) bool {
    return len(version) > 0 && len(version) < 20 && !strings.ContainsAny(version, "/../\\")
}

func isValidPlatform(platform string) bool {
    return platform == "macosx-amd64" || platform == "macosx-arm64"
}
