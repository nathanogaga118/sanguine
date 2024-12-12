package internal

import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
    "path/filepath"
    "crypto/sha256"
    "encoding/hex"
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
    if err := os.MkdirAll(cacheDir, 0755); err != nil {
        return "", err
    }

    binaryPath := filepath.Join(cacheDir, fmt.Sprintf("solc-%s", version))
    if _, err := os.Stat(binaryPath); err == nil {
        return binaryPath, nil
    }

    platform := "macosx-amd64"
    if IsAppleSilicon() {
        platform = "macosx-arm64"
    }

    listURL := fmt.Sprintf("https://binaries.soliditylang.org/%s/list.json", platform)
    resp, err := http.Get(listURL)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()

    var list SolcList
    if err := json.NewDecoder(resp.Body).Decode(&list); err != nil {
        return "", err
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
        return "", err
    }

    if err := os.Chmod(binaryPath, 0755); err != nil {
        return "", err
    }

    return binaryPath, nil
}

func downloadAndVerify(url, dest, expectedHash string) error {
    resp, err := http.Get(url)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    f, err := os.Create(dest)
    if err != nil {
        return err
    }
    defer f.Close()

    h := sha256.New()
    if _, err := io.Copy(io.MultiWriter(f, h), resp.Body); err != nil {
        return err
    }

    actualHash := "0x" + hex.EncodeToString(h.Sum(nil))
    if actualHash != expectedHash {
        os.Remove(dest)
        return fmt.Errorf("hash mismatch: expected %s, got %s", expectedHash, actualHash)
    }

    return nil
}
