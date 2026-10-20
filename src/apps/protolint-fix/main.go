package main

import (
	"bytes"
	"errors"
	"fmt"
	"os"
	"os/exec"
)

func exitCode(err error) int {
	if err == nil {
		return 0
	}
	var status *exec.ExitError
	if errors.As(err, &status) {
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
	var stdout, stderr bytes.Buffer
	fix := exec.Command(binary, args...)
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
	check := exec.Command(binary, checkArgs...)
	check.Stdout, check.Stderr = os.Stdout, os.Stderr
	os.Exit(exitCode(check.Run()))
}
