// cspell:words Getpid Unmarshal
import fs from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const bundlePath = resolve(root, "datamitsu.config.js");
const processors = [
  ["trace-sourcemeta", "JSONSCHEMA_BIN"],
  ["trace-check-jsonschema", "CHECK_JSONSCHEMA_FRONTEND"],
  ["trace-ajv", "AJV_FRONTEND"],
  ["trace-yq", "YQ_BIN"],
] as const;

const probeSource = `package main
import (
 "crypto/sha256"
 "encoding/hex"
 "encoding/json"
 "fmt"
 "io"
 "os"
 "os/exec"
 "os/signal"
 "strings"
 "syscall"
 "time"
)
const processorName = "PROCESSOR_LABEL"
func stderrPath() string { return fmt.Sprintf("/tmp/schepherd-processor-stderr/%d.log",os.Getpid()) }
func record(event,target string,code int,detail string){
 value:=map[string]any{"time":time.Now().UTC().Format(time.RFC3339Nano),"pid":os.Getpid(),"event":event,"processor":processorName,"target":target,"argv":os.Args[1:],"code":code,"detail":detail,"stderrFile":stderrPath()}
 if len(os.Args)>2 && (os.Args[1]=="compile" || os.Args[1]=="probe") {
  if data,err:=os.ReadFile(os.Args[2]);err==nil {hash:=sha256.Sum256(data);value["schemaSha256"]=hex.EncodeToString(hash[:]);var schema map[string]json.RawMessage;if json.Unmarshal(data,&schema)==nil{value["schemaId"]=string(schema["$id"]);value["schemaTitle"]=string(schema["title"])}}
 }
 data,_:=json.Marshal(value)
 file,err:=os.OpenFile("/tmp/schepherd-processor-trace.jsonl",os.O_CREATE|os.O_WRONLY|os.O_APPEND,0666)
 if err!=nil{fmt.Fprintln(os.Stderr,"TRACE_WRITE_ERROR",err);return};defer file.Close();_,_=file.Write(append(data,'\\n'))
}
func main(){
 if len(os.Args)==2&&os.Args[1]=="--trace-report"{traceReport();return}
 if len(os.Args)==2&&os.Args[1]=="--probe-version"{fmt.Fprintln(os.Stdout,"v0.0.0");return}
 target:=os.Getenv("PROBE_TARGET_"+strings.ToUpper(strings.ReplaceAll(processorName,"-","_")))
 record("start",target,0,"")
 command:=exec.Command(target,os.Args[1:]...);command.Env=os.Environ();command.Stdin=os.Stdin;command.Stdout=os.Stdout;command.Stderr=os.Stderr
 _=os.MkdirAll("/tmp/schepherd-processor-stderr",0755)
 if file,err:=os.OpenFile(stderrPath(),os.O_CREATE|os.O_WRONLY|os.O_APPEND,0666);err==nil{defer file.Close();command.Stderr=io.MultiWriter(os.Stderr,file)}
 signals:=make(chan os.Signal,1);signal.Notify(signals,syscall.SIGTERM,syscall.SIGINT)
 go func(){for s:=range signals{record("signal",target,0,s.String());signal.Reset(s);_=syscall.Kill(os.Getpid(),s.(syscall.Signal))}}()
 err:=command.Run();code:=0
 if err!=nil{if exit,ok:=err.(*exec.ExitError);ok{if state,ok:=exit.Sys().(syscall.WaitStatus);ok&&state.Signaled(){record("exit",target,128+int(state.Signal()),state.Signal().String());signal.Reset(state.Signal());_=syscall.Kill(os.Getpid(),state.Signal());return};code=exit.ExitCode()}else{code=127;record("start-error",target,code,err.Error())}}
 record("exit",target,code,"");os.Exit(code)
}

func traceReport() {
 if data,err:=os.ReadFile("/tmp/schepherd-native-stderr.log");err==nil{fmt.Printf("NATIVE_STDERR\\n%s\\n",data)}
 data,err:=os.ReadFile("/tmp/schepherd-processor-trace.jsonl")
 if err!=nil{fmt.Fprintln(os.Stderr,"TRACE_READ_ERROR",err);os.Exit(1)}
 starts:=map[int]map[string]any{}
 printRow:=func(row map[string]any){encoded,_:=json.Marshal(row);fmt.Println("PROCESSOR_TRACE",string(encoded))}
 printStderr:=func(row map[string]any){if path,ok:=row["stderrFile"].(string);ok{if bytes,err:=os.ReadFile(path);err==nil&&len(bytes)>0{fmt.Printf("PROCESSOR_STDERR %s\\n%s\\n",path,bytes)}}}
 for _,line:=range strings.Split(string(data),"\\n") {
  if line==""{continue};row:=map[string]any{};if err:=json.Unmarshal([]byte(line),&row);err!=nil{fmt.Fprintln(os.Stderr,"TRACE_PARSE_ERROR",err);os.Exit(1)}
  pid:=int(row["pid"].(float64));event,_:=row["event"].(string)
  if event=="start"{starts[pid]=row;continue}
  if event=="signal"||event=="start-error"{printRow(row);printStderr(row);continue}
  if event!="exit"{continue}
  code:=int(row["code"].(float64));duration:=time.Duration(0)
  if start,ok:=starts[pid];ok {begin,_:=time.Parse(time.RFC3339Nano,start["time"].(string));end,_:=time.Parse(time.RFC3339Nano,row["time"].(string));duration=end.Sub(begin)}
  row["durationMs"]=duration.Milliseconds()
  if duration>=time.Second||code==124||code>=128{printRow(row)}
  if code==124||code>=128{printStderr(row)}
  delete(starts,pid)
 }
 for _,row:=range starts{row["missingExit"]=true;printRow(row);printStderr(row)}
}
`;
const supervisorSource = `//go:build !windows

package main

import (
 "fmt"
 "io"
 "os"
 "os/exec"
 "os/signal"
 "syscall"
)

func execManagedCommand(path string,args,environment []string) error {
 logPath:="/tmp/schepherd-processor-trace.jsonl"
 environment=append(environment,"PROBE_LOG_PATH="+logPath)
 fmt.Fprintf(os.Stderr,"TRACE_BINDINGS JSONSCHEMA_BIN=%q AJV_FRONTEND=%q CHECK_JSONSCHEMA_FRONTEND=%q\\n",os.Getenv("JSONSCHEMA_BIN"),os.Getenv("AJV_FRONTEND"),os.Getenv("CHECK_JSONSCHEMA_FRONTEND"))
 command:=exec.Command(path,args[1:]...)
 command.Env=environment;command.Stdin=os.Stdin;command.Stdout=os.Stdout;command.Stderr=os.Stderr
 if file,err:=os.OpenFile("/tmp/schepherd-native-stderr.log",os.O_CREATE|os.O_WRONLY|os.O_APPEND,0666);err==nil{defer file.Close();command.Stderr=io.MultiWriter(os.Stderr,file)}
 signals:=make(chan os.Signal,1);signal.Notify(signals,syscall.SIGTERM,syscall.SIGINT);defer signal.Stop(signals)
 if err:=command.Start();err!=nil{return err}
 go func(){for s:=range signals{_=command.Process.Signal(s)}}()
 err:=command.Wait()
 if data,readErr:=os.ReadFile(logPath);readErr==nil{_,_=os.Stderr.Write(data)}else{fmt.Fprintln(os.Stderr,"TRACE_READ_ERROR",readErr)}
 if e,ok:=err.(*exec.ExitError);ok{if status,ok:=e.Sys().(syscall.WaitStatus);ok&&status.Signaled(){signal.Reset(status.Signal());_=syscall.Kill(os.Getpid(),status.Signal())}}
 return err
}
`;
const wrapper = `
;(() => {
  const original = globalThis.getConfig;
  globalThis.getConfig = (...args) => {
    const config = original(...args);
    const app = config.apps.schepherd;
    const processors = ${JSON.stringify(processors)};
    const apps = { ...config.apps };
    const prepareEnv = { ...app.prepare.env };
    for (const [name, binding] of processors) {
      apps[name] = {
        files: {
          "main.go": ${JSON.stringify(probeSource)}.replace("PROCESSOR_LABEL", name),
          "go.mod": app.files["go.mod"],
        },
        go: { ...app.go, version: "v0.0.0" },
        versionCheck: { args: ["--probe-version"] },
      };
      prepareEnv["PROBE_TARGET_" + name.toUpperCase().split("-").join("_")] = prepareEnv[binding];
      prepareEnv[binding] = "\${APP_BIN:" + name + "}";
    }
    apps.schepherd = {
      ...app,
      dependsOn: [...app.dependsOn, ...processors.map(([name]) => name)],
      files: { ...app.files, "exec_unix.go": ${JSON.stringify(supervisorSource)} },
      prepare: { ...app.prepare, env: prepareEnv },
    };
    return { ...config, apps };
  };
})();
`;

for (const path of ["docker/Dockerfile", "docker/Dockerfile.alpine"]) {
  const file = resolve(root, path);
  const content = fs.readFileSync(file, "utf8");
  const run =
    "RUN datamitsu --config /opt/datamitsu-config/datamitsu.config.js install schepherd\n";
  const traced = `RUN status=0; datamitsu --config /opt/datamitsu-config/datamitsu.config.js install schepherd || status=$?; datamitsu --config /opt/datamitsu-config/datamitsu.config.js exec trace-sourcemeta -- --trace-report; exit "$status"\n`;
  if (!content.includes(run)) throw new Error(`Missing schepherd install stage in ${path}`);
  fs.writeFileSync(file, content.replace(run, traced));
}
fs.appendFileSync(bundlePath, wrapper);
