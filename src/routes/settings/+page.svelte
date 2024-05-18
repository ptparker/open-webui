<script context="module">
  // This script runs before the component is created and can include preloading logic
  export async function load({ params, fetch }) {
    // Fetch the current YAML content from the backend
    console.log('Fetching YAML content from the backend...');
    const response = await fetch('/api/config/yaml');
    if (response.ok) {
      const yamlText = await response.text();
      console.log('YAML content fetched:', yamlText);
      // Set the fetched content to the yamlContent store
      yamlContent.set(yamlText);
    } else {
      console.error('Failed to load YAML content', response);
      throw new Error('Failed to load YAML content');
    }
    return {};
  }
</script>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as monaco from 'monaco-editor';
  import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
  import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
  import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
  import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
  import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
  import { writable } from 'svelte/store';

  let editorContainer: HTMLElement;
  let editor: monaco.editor.IStandaloneCodeEditor;
  let yamlContent = writable('');

  self.MonacoEnvironment = {
    getWorker: function (_: string, label: string) {
      switch (label) {
        case 'css': return new cssWorker();
        case 'html': return new htmlWorker();
        case 'json': return new jsonWorker();
        case 'typescript':
        case 'javascript': return new tsWorker();
        default: return new editorWorker();
      }
    }
  };

  onMount(() => {
    editor = monaco.editor.create(editorContainer, {
      value: $yamlContent,
      language: 'yaml',
      theme: 'vs-dark'
    });

    return () => {
      editor.dispose();
    };
  });

  onDestroy(() => {
    if (editor) {
      editor.dispose();
    }
  });

  // Function to save changes to the YAML content
  async function saveChanges() {
    console.log('Attempting to save changes...');
    try {
      const response = await fetch('/api/config/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ yaml_content: $yamlContent }),
      });
      if (!response.ok) {
        throw new Error('Failed to save changes');
      }
      console.log('Changes saved successfully');
      alert('Changes saved successfully');
    } catch (error) {
      console.error(`Error saving changes: ${error.message}`);
      alert(`Error: ${error.message}`);
    }
  }

  // Function to create a backup of the YAML content
  async function createBackup() {
    console.log('Attempting to create a backup...');
    const backupFilename = `backup-${new Date().toISOString()}.yaml`;
    try {
      const response = await fetch('/api/config/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ yaml_content: $yamlContent, backup_filename: backupFilename }),
      });
      if (!response.ok) {
        throw new Error('Failed to create backup');
      }
      console.log('Backup created successfully');
      alert('Backup created successfully');
    } catch (error) {
      console.error(`Error creating backup: ${error.message}`);
      alert(`Error: ${error.message}`);
    }
  }
</script>

<style>
  .editor-container {
    width: 100%;
    height: 600px;
  }
</style>

<div class="settings-content">
  <h1>Settings</h1>
  <div class="editor-container" bind:this={editorContainer}></div>
  <!-- Buttons for saving changes and creating backups -->
  <button on:click={saveChanges}>Save Changes</button>
  <button on:click={createBackup}>Create Backup</button>
</div>

<div class="md:px-2 mb-3 text-left w-full absolute bottom-0 left-0 right-0">
  <div class="flex w-full px-2">
    <div class=" bg-gray-100 dark:bg-gray-700 w-10 rounded-l-xl text-center">
      <div class=" text-lg font-semibold mt-2">@</div>
    </div>

    <div class="max-h-60 flex flex-col w-full rounded-r-xl bg-white">
      <div class="m-1 overflow-y-auto p-1 rounded-r-xl space-y-0.5">
        {#each filteredModels as model, modelIdx}
          <button
            class=" px-3 py-1.5 rounded-xl w-full text-left {modelIdx === selectedIdx
              ? ' bg-gray-100 selected-command-option-button'
              : ''}"
            type="button"
            on:click={() => {
              confirmSelect(model);
            }}
            on:mousemove={() => {
              selectedIdx = modelIdx;
            }}
            on:focus={() => {}}
          >
            <div class=" font-medium text-black line-clamp-1">
              {model.name}
            </div>
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>
