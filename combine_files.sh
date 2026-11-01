#!/bin/bash

# Final chunk prefix
CHUNK_PREFIX="code"

# Target maximum size per chunk in bytes (50KB = 50 * 1024)
MAX_SIZE=$((50 * 1024))

echo "Starting file combination..."
echo "Files will be grouped into approx 50KB chunks: ${CHUNK_PREFIX}00.txt, ${CHUNK_PREFIX}01.txt, ..."
echo "Individual files will strictly not be split across chunks."

# Remove old chunks if they exist
rm -f ${CHUNK_PREFIX}*.txt combined_output.txt

# Initialize chunking variables
CHUNK_INDEX=0
# Format chunk file names with 2-digit padding (e.g., code00.txt, code01.txt)
CURRENT_CHUNK=$(printf "%s%02d.txt" "$CHUNK_PREFIX" "$CHUNK_INDEX")
> "$CURRENT_CHUNK"

# We use process substitution < <(...) so the while-loop variables remain available in the main shell
while IFS= read -r -d '' file; do
    
    # Skip this script and previous output parts
    case "$(basename "$file")" in
        combine_files.sh|combined_output.txt|${CHUNK_PREFIX}*.txt)
            echo "Skipping excluded file: $file"
            continue
            ;;
    esac

    # Calculate current chunk size (strip spaces for max compatibility)
    CURRENT_SIZE=$(wc -c < "$CURRENT_CHUNK" | tr -d ' ')
    
    # Calculate size of the file we are about to add
    FILE_SIZE=$(wc -c < "$file" | tr -d ' ')

    # If adding this file exceeds MAX_SIZE and the chunk is NOT empty, start a new chunk
    if [ "$CURRENT_SIZE" -gt 0 ] && [ $((CURRENT_SIZE + FILE_SIZE)) -gt "$MAX_SIZE" ]; then
        CHUNK_INDEX=$((CHUNK_INDEX + 1))
        CURRENT_CHUNK=$(printf "%s%02d.txt" "$CHUNK_PREFIX" "$CHUNK_INDEX")
        > "$CURRENT_CHUNK"
    fi

    # Append the file directly into the current chunk
    echo "--- File: $file ---" >> "$CURRENT_CHUNK"
    cat "$file" >> "$CURRENT_CHUNK"
    echo "" >> "$CURRENT_CHUNK"

done < <(find . \
    \( -type d \( -name "__pycache__" -o -name "node_modules" -o -name "public" -o -name ".yaml" \) -prune \) -o \
    \( -type f \
       ! -name "*.yaml" \
       ! -name "*.yml" \
       ! -name "*.mp3" \
       ! -name "*.mp4" \
       ! -name "*.md" \
       ! -name "*.pyc" \
       ! -name "*.svg" \
       ! -name "*.ttf" \
       ! -name "*.otf" \
       ! -name "*.gif" \
       ! -name "*.webp" \
       ! -name "*.png" \
       ! -name "package-lock.json" \
       -print0 \))

# Remove the final chunk if it ended up completely empty
if [ ! -s "$CURRENT_CHUNK" ]; then
    rm -f "$CURRENT_CHUNK"
fi

echo "---"
echo "Chunking complete:"
ls -lh ${CHUNK_PREFIX}*.txt

echo "---"
echo "Total lines across all chunks:"
# Print the total lines for all generated chunk files
wc -l ${CHUNK_PREFIX}*.txt | grep "total$" || wc -l ${CHUNK_PREFIX}*.txt