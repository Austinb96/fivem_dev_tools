using System.Text;
using CodeWalkerCli.Utils;

namespace CodeWalkerCli.Interactive
{
    public class InputHandler
    {
        private const int MAX_INPUT_LENGTH = 1024;
        private int currentMatchIndex = 0;
        private string? lastSearch = null;
        private readonly string[] validExtensions = { ".ymap", ".ytyp", ".ymt", ".xml" };
        private readonly List<string> commandHistory = new();
        private int historyIndex = -1;
        private int cursorPosition = 0;
        private string? currentInput;

        public string ReadLineWithCompletion()
        {
            var builder = new StringBuilder();
            ConsoleUtils.WritePrompt();
            cursorPosition = 0;
            
            // Missing initialization of input variable
            ConsoleKeyInfo input;
            do
            {
                input = ConsoleUtils.ReadKey(intercept: true);

                switch (input.Key)
                {
                    case ConsoleKey.Tab:
                        HandleTabCompletion(builder, (input.Modifiers & ConsoleModifiers.Shift) == ConsoleModifiers.Shift);
                        break;
                        
                    case ConsoleKey.LeftArrow:
                        if (cursorPosition > 0)
                        {
                            cursorPosition--;
                            Console.SetCursorPosition(Console.CursorLeft - 1, Console.CursorTop);
                        }
                        break;
                        
                    case ConsoleKey.RightArrow:
                        if (cursorPosition < builder.Length)
                        {
                            cursorPosition++;
                            Console.SetCursorPosition(Console.CursorLeft + 1, Console.CursorTop);
                        }
                        break;
                        
                    case ConsoleKey.UpArrow:
                        if (commandHistory.Count > 0)
                        {
                            if (historyIndex == -1)
                            {
                                // Store current input before navigating history
                                currentInput = builder.ToString();
                            }
                            historyIndex = Math.Min(historyIndex + 1, commandHistory.Count - 1);
                            UpdateInputFromHistory(builder);
                        }
                        break;
                        
                    case ConsoleKey.DownArrow:
                        if (historyIndex >= 0)
                        {
                            historyIndex--;
                            UpdateInputFromHistory(builder);
                        }
                        break;
                        
                    case ConsoleKey.Home:
                        cursorPosition = 0;
                        Console.SetCursorPosition(2, Console.CursorTop); // Account for "> "
                        break;
                        
                    case ConsoleKey.End:
                        cursorPosition = builder.Length;
                        Console.SetCursorPosition(2 + builder.Length, Console.CursorTop);
                        break;
                        
                    case ConsoleKey.Delete:
                        if (cursorPosition < builder.Length)
                        {
                            var pos = Console.CursorLeft;
                            builder.Remove(cursorPosition, 1);
                
                            // Move the rest of the line left
                            var textToMove = builder.ToString(cursorPosition, builder.Length - cursorPosition);
                            Console.Write(textToMove + " ");  // Add space to clear last character
                            Console.SetCursorPosition(pos, Console.CursorTop);
                
                            ResetCompletion();
                        }
                        break;
                        
                    default:
                        HandleKeyInput(builder, input);
                        break;
                }

            } while (input.Key != ConsoleKey.Enter);

            Console.WriteLine();
            
            // Add to history if not empty and not duplicate of last command
            var command = builder.ToString();
            if (!string.IsNullOrWhiteSpace(command) && 
                (commandHistory.Count == 0 || commandHistory[0] != command))
            {
                commandHistory.Insert(0, command);
            }
            historyIndex = -1;
            
            return command;
        }

        private void HandleKeyInput(StringBuilder builder, ConsoleKeyInfo input)
        {
            if (input.Key == ConsoleKey.Backspace && builder.Length > 0 && cursorPosition > 0)
            {
                var pos = Console.CursorLeft;
                builder.Remove(cursorPosition - 1, 1);
                cursorPosition--;
                
                // Move the rest of the line left
                var textToMove = builder.ToString(cursorPosition, builder.Length - cursorPosition);
                Console.SetCursorPosition(pos - 1, Console.CursorTop);
                Console.Write(textToMove + " ");  // Add space to clear last character
                Console.SetCursorPosition(pos - 1, Console.CursorTop);
                
                ResetCompletion();
            }
            else if (!char.IsControl(input.KeyChar))
            {
                if (builder.Length >= MAX_INPUT_LENGTH)
                {
                    return;  // Ignore input if we're at max length
                }
                if (Console.CursorLeft < Console.WindowWidth - 1)
                {
                    var pos = Console.CursorLeft;
                    builder.Insert(cursorPosition, input.KeyChar);
                    
                    // Write from the cursor position to the end
                    var textToMove = builder.ToString(cursorPosition, builder.Length - cursorPosition);
                    Console.Write(textToMove);
                    cursorPosition++;
                    Console.SetCursorPosition(pos + 1, Console.CursorTop);
                    
                    ResetCompletion();
                }
            }
        }

        private void HandleTabCompletion(StringBuilder builder, bool reverse = false)
        {
            var currentInput = builder.ToString();
            var lastWord = currentInput.Split(' ').LastOrDefault() ?? "";
            var searchTerm = lastSearch ?? lastWord;
            
            try
            {
                var (searchDir, searchPattern) = GetSearchParameters(searchTerm);
                var matches = FindMatches(searchDir, searchPattern);

                if (!matches.Any()) return;

                UpdateMatchIndex(reverse, matches.Length);
                var match = matches[currentMatchIndex];
                
                if (Directory.Exists(match))
                {
                    match += "/";
                }

                // Update input line
                var words = currentInput.Split(' ');
                words[^1] = match;
                lastSearch = searchTerm;  // Store the original search term
                UpdateInputLine(builder, string.Join(" ", words));
            }
            catch (Exception ex)
            {
                ConsoleUtils.WriteError($"Tab completion error: {ex.Message}");
            }
        }

        private (string dir, string pattern) GetSearchParameters(string searchTerm)
        {
            // Fixed: missing return in if block
            if (searchTerm.EndsWith("/") || searchTerm.EndsWith("\\"))
            {
                var dir = Path.GetFullPath(Path.GetDirectoryName(searchTerm) ?? ".");
                return (dir, "*");
            }

            var searchDir = Path.GetFullPath(Path.GetDirectoryName(searchTerm) ?? ".");
            if (!Directory.Exists(searchDir))
            {
                searchDir = Path.GetDirectoryName(searchDir) ?? ".";
            }

            var searchPattern = Path.GetFileName(searchTerm) + "*";
            return (searchDir, searchPattern);  // Added missing return statement
        }

        private string[] FindMatches(string searchDir, string searchPattern)
        {
            if (!Directory.Exists(searchDir))
            {
                searchDir = Path.GetDirectoryName(searchDir) ?? ".";
            }

            return Directory.GetFileSystemEntries(searchDir)
                .Select(p => Path.GetRelativePath(".", p).Replace("\\", "/"))
                .Where(p => 
                {
                    // Don't filter by extension anymore since we want all files/folders
                    var fileName = Path.GetFileName(p);
                    var isMatch = fileName.StartsWith(searchPattern.TrimEnd('*'), StringComparison.OrdinalIgnoreCase);
                    return isMatch && p != ".";  // Only exclude current directory
                })
                .OrderBy(p => !Directory.Exists(p))  // Directories first
                .ThenBy(p => p)
                .ToArray();
        }

        private void UpdateMatchIndex(bool reverse, int matchCount)
        {
            if (lastSearch == null)
            {
                currentMatchIndex = reverse ? matchCount - 1 : 0;
            }
            else
            {
                currentMatchIndex = reverse ? 
                    (currentMatchIndex - 1 + matchCount) % matchCount :
                    (currentMatchIndex + 1) % matchCount;
            }
        }

        private void UpdateInputLine(StringBuilder builder, string newInput)
        {
            ConsoleUtils.ClearCurrentLine();
            builder.Clear();
            ConsoleUtils.WritePrompt();
            Console.Write(newInput);
            builder.Append(newInput);
            cursorPosition = newInput.Length;
        }

        private void UpdateInputFromHistory(StringBuilder builder)
        {
            ConsoleUtils.ClearCurrentLine();
            builder.Clear();
            ConsoleUtils.WritePrompt();
            
            if (historyIndex >= 0)
            {
                var historyItem = commandHistory[historyIndex];
                builder.Append(historyItem);
                Console.Write(historyItem);
                cursorPosition = historyItem.Length;
            }
            else if (currentInput != null)
            {
                builder.Append(currentInput);
                Console.Write(currentInput);
                cursorPosition = currentInput.Length;
                currentInput = null;  // Clear it after use
            }
            else
            {
                cursorPosition = 0;
            }
        }

        private void ResetCompletion()
        {
            currentMatchIndex = 0;
            lastSearch = null;
        }
    }
}
