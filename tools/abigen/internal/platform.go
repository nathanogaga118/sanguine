package internal

import (
    "runtime"
    "strings"
    "os/exec"
)

// IsAppleSilicon returns true if running on Apple Silicon (ARM64) architecture
func IsAppleSilicon() bool {
    if runtime.GOOS != "darwin" {
        return false
    }
    cmd := exec.Command("uname", "-m")
    output, err := cmd.Output()
    if err != nil {
        return false
    }
    return strings.TrimSpace(string(output)) == "arm64"
}
