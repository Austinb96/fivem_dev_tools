namespace CodeWalkerCli.Utils
{
    public static class ConsoleUtils
    {
        private static readonly ConsoleColor DefaultColor = Console.ForegroundColor;
        
        // Message type colors
        private static readonly Dictionary<MessageType, ConsoleColor> Colors = new()
        {
            { MessageType.Info, ConsoleColor.Cyan },
            { MessageType.Error, ConsoleColor.Red },
            { MessageType.Success, ConsoleColor.Green },
            { MessageType.Warning, ConsoleColor.Yellow },
            { MessageType.Prompt, ConsoleColor.Yellow },
            { MessageType.CMD, ConsoleColor.DarkGray },
        };

        public enum MessageType
        {
            Info,
            Error,
            Success,
            Warning,
            Prompt,
            CMD,
        }

        public static void Write(string message, ConsoleColor color)
        {
            var originalColor = Console.ForegroundColor;
            Console.ForegroundColor = color;
            Console.Write(message);
            Console.ForegroundColor = originalColor;
        }

        public static void WriteLine(string message, ConsoleColor color)
        {
            Write($"{message}\n", color);
        }

        public static void WriteMessage(MessageType type, string message)
        {
            Write($"[{type.ToString().ToUpper()}]", Colors[type]);
            Console.WriteLine($" {message}");
        }

        public static void WritePrompt()
        {
            Write("> ", Colors[MessageType.Prompt]);
        }

        // Helper methods for common message types
        public static void WriteInfo(string message) => WriteMessage(MessageType.Info, message);
        public static void WriteError(string message) => WriteMessage(MessageType.Error, message);
        public static void WriteSuccess(string message) => WriteMessage(MessageType.Success, message);
        public static void WriteWarning(string message) => WriteMessage(MessageType.Warning, message);
        public static void WriteCMD(string message) => WriteMessage(MessageType.CMD, message);

        public static void ClearCurrentLine()
        {
            int currentLine = Console.CursorTop;
            Console.SetCursorPosition(0, currentLine);
            Console.Write(new string(' ', Console.WindowWidth));
            Console.SetCursorPosition(0, currentLine);
        }

        public static void ClearLines(int count)
        {
            int currentLine = Console.CursorTop;
            for (int i = 0; i < count; i++)
            {
                Console.SetCursorPosition(0, Math.Max(0, currentLine - i));
                Console.Write(new string(' ', Console.WindowWidth));
            }
            Console.SetCursorPosition(0, Math.Max(0, currentLine - count + 1));
        }

        public static string? ReadLine(string prompt)
        {
            WritePrompt();
            return Console.ReadLine();
        }

        public static ConsoleKeyInfo ReadKey(bool intercept = false)
        {
            return Console.ReadKey(intercept);
        }

        public static void SetCursorPosition(int left, int top)
        {
            try
            {
                Console.SetCursorPosition(
                    Math.Min(Math.Max(0, left), Console.WindowWidth - 1),
                    Math.Min(Math.Max(0, top), Console.WindowHeight - 1)
                );
            }
            catch (ArgumentOutOfRangeException)
            {
                // Ignore cursor position errors
            }
        }
    }
}
