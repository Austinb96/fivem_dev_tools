using CommandLine;
using CodeWalker.GameFiles;

namespace CodeWalkerCli.Commands
{
    [Verb("exportxml", HelpText = "Export file to XML format")]
    public class ExportOptions
    {
        [Option('i', "input", Required = true, HelpText = "Input file path")]
        public string InputPath { get; set; } = string.Empty;

        [Option('o', "output", Required = false, Default = null, HelpText = "Output file path")]
        public string OutputPath { get; set; } = string.Empty;

        [Option('m', "meta", Required = false, Default = null, HelpText = "Meta format (RSC, PSO, RBF)")]
        public MetaFormat? MetaFormat { get; set; }

        public ExportOptions() { }
    }

    [Verb("importxml", HelpText = "Import XML to game format")]
    public class ImportOptions
    {
        [Option('i', "input", Required = true, HelpText = "Input XML file path")]
        public string InputPath { get; set; } = string.Empty;

        [Option('o', "output", Required = true, HelpText = "Output file path")]
        public string OutputPath { get; set; } = string.Empty;

        [Option('m', "meta", Required = false, Default = MetaFormat.RSC,
            HelpText = "Meta format (RSC, PSO, RBF)")]
        public MetaFormat MetaFormat { get; set; }

        public ImportOptions() { }
    }
    
    [Verb("exportmodel", HelpText = "Export model file by name or hash")]
    public class ExportModelOptions 
    {
        [Option('n', "name", Required = true, HelpText = "Model name or hash")]
        public string Name { get; set; } = string.Empty;

        [Option('o', "output", Required = false, HelpText = "Output file path")]
        public string OutputPath { get; set; } = string.Empty;

        [Option('t', "type", Required = false, Default = "", HelpText = "File type (ydr, ydd, ytd, yft)")]
        public string Type { get; set; } = string.Empty;
    }

    [Verb("hello", HelpText = "Say hello")]
    public class HelloOptions
    {
        [Option('n', "name", Required = true, Default = "World", HelpText = "Name to greet")]
        public string Name { get; set; } = string.Empty;
        
        public HelloOptions() { }
    }
}
