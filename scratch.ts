const config = {
    "actions": [
        {
            "type": "remove_label",
            "value": "delete"
        }
    ]
};

const additions: { type: string, value: string }[] = [];
const removals: { type: string, value: string }[] = [];

for (const action of config.actions) {
    if (action.type === 'add_label') {
        additions.push({ type: 'label', value: action.value });
    } else if (action.type === 'remove_label') {
        removals.push({ type: 'label', value: action.value });
    }
}

const queryParts: string[] = [];
const addCounters: Record<string, number> = { 'label': 0, 'collection': 0 };
const remCounters: Record<string, number> = { 'label': 0, 'collection': 0 };

additions.forEach(add => {
    const index = addCounters[add.type]++;
    const key = `${add.type}[${index}].tag.tag`;
    queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(add.value)}`);
});

removals.forEach(rem => {
    const index = remCounters[rem.type]++;
    const key = `${rem.type}[${index}].tag.tag-`;
    queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(rem.value)}`);
});

if (addCounters['label'] > 0 || remCounters['label'] > 0) {
    queryParts.push(`${encodeURIComponent('label.locked')}=1`);
}

console.log(queryParts.join('&'));
