// Command protolint-fix reports verification findings rather than protolint's pre-fix diagnostics.
package main

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
)

func exitCode(err error) int {
	if err == nil {
		return 0
	}
	if status, ok := errors.AsType[*exec.ExitError](err); ok {
		return status.ExitCode()
	}
	fmt.Fprintln(os.Stderr, err)
	return 1
}

func main() {
	if len(os.Args) < 3 {
		fmt.Fprintln(os.Stderr, "usage: protolint-fix <protolint-binary> <lint-arguments...>")
		os.Exit(2)
	}
	binary, args := os.Args[1], os.Args[2:]
	ctx := context.Background()
	var stdout, stderr bytes.Buffer
	fix := exec.CommandContext(ctx, binary, args...) // #nosec G204 G702 -- Datamitsu supplies its pinned executable and configured argv, without a shell.
	fix.Stdout, fix.Stderr = &stdout, &stderr
	err := fix.Run()
	var status *exec.ExitError
	if err != nil && (!errors.As(err, &status) || status.ExitCode() != 1) {
		_, _ = os.Stdout.Write(stdout.Bytes())
		_, _ = os.Stderr.Write(stderr.Bytes())
		os.Exit(exitCode(err))
	}
	checkArgs := make([]string, 0, len(args))
	for _, arg := range args {
		if arg != "-fix" {
			checkArgs = append(checkArgs, arg)
		}
	}
	check := exec.CommandContext(ctx, binary, checkArgs...) // #nosec G204 G702 -- Verification reuses the same pinned executable and configured argv.
	check.Stdout, check.Stderr = os.Stdout, os.Stderr
	os.Exit(exitCode(check.Run()))
}
