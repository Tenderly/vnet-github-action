#!/bin/bash

# Check if directory argument is provided
if [ $# -ne 1 ]; then
    echo "Usage: $0 <directory>" >&2
    exit 1
fi

SOURCE_DIR="$1"
OUTPUT_FILE="all.ats"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: Directory '$SOURCE_DIR' does not exist" >&2
    exit 1
fi

# Clear or create output file
> "$OUTPUT_FILE"

# Find all files and concatenate them with their paths as TypeScript comments
find "$SOURCE_DIR" -type f -print0 | while IFS= read -r -d $'\0' file; do
    # Get relative path
    relative_path="${file#./}"
    
    # Add file path as TypeScript comment and content to output file
    echo "// @filename: $relative_path" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo -e "\n" >> "$OUTPUT_FILE"
done

echo "All files have been concatenated to $OUTPUT_FILE"