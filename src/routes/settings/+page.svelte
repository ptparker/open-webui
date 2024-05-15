<script context="module">
  // This script runs before the component is created and can include preloading logic
  export async function load({ params, fetch }) {
    // You can perform any preloading operations here if necessary
    // For now, we'll just return an empty object
    return {};
  }
</script>

<script lang="ts">
	import MonacoEditor from 'svelte-monaco';
	import { createEventDispatcher } from 'svelte';
	import { writable } from 'svelte/store';

	import { generatePrompt } from '$lib/apis/ollama';
	import { models } from '$lib/stores';
	import { splitStream } from '$lib/utils';
	import { tick, getContext } from 'svelte';
	import { toast } from 'svelte-sonner';

	const i18n = getContext('i18n');

	const dispatch = createEventDispatcher();

	export let prompt = '';
	export let user = null;

	export let chatInputPlaceholder = '';
	export let messages = [];

	let selectedIdx = 0;
	let filteredModels = [];

	$: filteredModels = $models
		.filter((p) => p.name.includes(prompt.split(' ')?.at(0)?.substring(1) ?? ''))
		.sort((a, b) => a.name.localeCompare(b.name));

	$: if (prompt) {
		selectedIdx = 0;
	}

	export const selectUp = () => {
		selectedIdx = Math.max(0, selectedIdx - 1);
	};

	export const selectDown = () => {
		selectedIdx = Math.min(selectedIdx + 1, filteredModels.length - 1);
	};

	const confirmSelect = async (model) => {
		prompt = '';
		dispatch('select', model);
	};

	const confirmSelectCollaborativeChat = async (model) => {
		// dispatch('select', model);
		prompt = '';
		user = JSON.parse(JSON.stringify(model.name));
		await tick();

		chatInputPlaceholder = $i18n.t('{{modelName}} is thinking...', { modelName: model.name });

		const chatInputElement = document.getElementById('chat-textarea');

		await tick();
		chatInputElement?.focus();
		await tick();

		const convoText = messages.reduce((a, message, i, arr) => {
			return `${a}### ${message.role.toUpperCase()}\n${message.content}\n\n`;
		}, '');

		const res = await generatePrompt(localStorage.token, model.name, convoText);

		if (res && res.ok) {
			const reader = res.body
				.pipeThrough(new TextDecoderStream())
				.pipeThrough(splitStream('\n'))
				.getReader();

			while (true) {
				const { value, done } = await reader.read();
				if (done) {
					break;
				}

				try {
					let lines = value.split('\n');

					for (const line of lines) {
						if (line !== '') {
							console.log(line);
							let data = JSON.parse(line);

							if ('detail' in data) {
								throw data;
							}

							if ('id' in data) {
								console.log(data);
							} else {
								if (data.done == false) {
									if (prompt == '' && data.response == '\n') {
										continue;
									} else {
										prompt += data.response;
										console.log(data.response);
										chatInputElement.scrollTop = chatInputElement.scrollHeight;
										await tick();
									}
								}
							}
						}
					}
				} catch (error) {
					console.log(error);
					if ('detail' in error) {
						toast.error(error.detail);
					}
					break;
				}
			}
		} else {
			if (res !== null) {
				const error = await res.json();
				console.log(error);
				if ('detail' in error) {
					toast.error(error.detail);
				} else {
					toast.error(error.error);
				}
			} else {
				toast.error(
					$i18n.t('Uh-oh! There was an issue connecting to {{provider}}.', { provider: 'llama' })
				);
			}
		}

		chatInputPlaceholder = '';

		console.log(user);
	};

  // Reactive variable to hold the YAML content
  let yamlContent = writable(`# YAML content goes here`);

  // Function to save changes to the YAML content
  async function saveChanges() {
    try {
      const response = await fetch('/config/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ yaml_content: $yamlContent }),
      });
      if (!response.ok) {
        throw new Error('Failed to save changes');
      }
      alert('Changes saved successfully');
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  }

  // Function to create a backup of the YAML content
  async function createBackup() {
    const backupFilename = `backup-${new Date().toISOString()}.yaml`;
    try {
      const response = await fetch('/config/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ yaml_content: $yamlContent, backup_filename: backupFilename }),
      });
      if (!response.ok) {
        throw new Error('Failed to create backup');
      }
      alert('Backup created successfully');
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  }
</script>

<div class="settings-content">
  <h1>Settings</h1>
  <!-- Monaco Editor for YAML content -->
  <MonacoEditor bind:value={$yamlContent} language="yaml" theme="vs-dark" />
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
