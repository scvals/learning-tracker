// Навыки: создание, редактирование, удаление, порядок, подсказка «плохого дня».

import * as store from '../store.js';
import { h, ico, sheet, toast, confirmDialog } from '../ui.js';
import { SKILL_ICONS } from '../icons.js';
import { plural } from '../dates.js';

export const COLORS = [1, 2, 3, 4, 5, 6];

// Навыки в порядке подсказки (hintOrder, затем обычный порядок).
export function hintSkills() {
  return store.skills().slice().sort((a, b) =>
    (a.hintOrder ?? 999) - (b.hintOrder ?? 999) || (a.order ?? 0) - (b.order ?? 0));
}

export function hintText() {
  const parts = hintSkills().map((s) => (s.minimum || '').trim()).filter(Boolean);
  return parts.length ? `Плохой день? Минимум: ${parts.join(', ')}.` : 'Плохой день? Задайте минимум для навыков — он появится здесь.';
}

// Переставить запись на одну позицию в списке и перенумеровать поле.
export function moveInList(col, items, index, dir, field = 'order') {
  const j = index + dir;
  if (j < 0 || j >= items.length) return false;
  const arr = items.slice();
  [arr[index], arr[j]] = [arr[j], arr[index]];
  arr.forEach((it, i) => { if (it[field] !== i + 1) store.patch(col, it.id, { [field]: i + 1 }); });
  return true;
}

// Окно редактирования навыка. skill = null → новый. onDone(skill) после сохранения.
export function editSkill(skill, { onDone } = {}) {
  const isNew = !skill;
  const all = store.skills();
  const state = {
    name: skill?.name || '',
    icon: skill?.icon || SKILL_ICONS[0],
    color: skill?.color || nextColor(all),
    minimum: skill?.minimum || '',
    checklistTitle: skill?.checklistTitle || 'Освоено',
    priority: !!skill?.priority,
  };
  const uidp = Math.random().toString(36).slice(2, 6);

  const nameInput = h('input', { id: `sk_name_${uidp}`, class: 'input', type: 'text', value: state.name,
    placeholder: 'Например, Рисование', required: true, maxlength: 60, autofocus: true });
  const minInput = h('input', { id: `sk_min_${uidp}`, class: 'input', type: 'text', value: state.minimum,
    placeholder: 'Например, один набросок', maxlength: 80 });
  const titleInput = h('input', { id: `sk_ct_${uidp}`, class: 'input', type: 'text', value: state.checklistTitle,
    placeholder: 'Освоенные приёмы', maxlength: 60 });
  const prioInput = h('input', { id: `sk_pr_${uidp}`, type: 'checkbox', class: 'checkbox', checked: state.priority });

  const iconGrid = h('div', { class: 'set-icon-grid', role: 'radiogroup', 'aria-label': 'Иконка навыка' });
  const colorRow = h('div', { class: 'set-color-row', role: 'radiogroup', 'aria-label': 'Цвет навыка' });

  function paintIcons() {
    iconGrid.replaceChildren(...SKILL_ICONS.map((name) => h('button', {
      type: 'button', class: `set-icon-opt sk-${state.color}${state.icon === name ? ' is-active' : ''}`,
      role: 'radio', 'aria-checked': String(state.icon === name), 'aria-label': `Иконка ${name}`,
      onclick: () => { state.icon = name; paintIcons(); },
    }, ico(name))));
  }
  function paintColors() {
    colorRow.replaceChildren(...COLORS.map((c) => h('button', {
      type: 'button', class: `set-color-opt sk-${c}${state.color === c ? ' is-active' : ''}`,
      role: 'radio', 'aria-checked': String(state.color === c), 'aria-label': `Цвет ${c}`,
      onclick: () => { state.color = c; paintColors(); paintIcons(); },
    }, state.color === c ? ico('check') : null)));
  }
  paintIcons();
  paintColors();

  const form = h('form', { class: 'form', onsubmit: (e) => { e.preventDefault(); save(); } },
    h('div', { class: 'field' }, h('label', { class: 'field__label', for: nameInput.id }, 'Название'), nameInput),
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, 'Иконка'), iconGrid),
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, 'Цвет'), colorRow),
    h('div', { class: 'field' }, h('label', { class: 'field__label', for: minInput.id }, 'Минимум на плохой день'), minInput,
      h('div', { class: 'field__hint' }, 'Самое маленькое действие, которое всё равно считается занятием.')),
    h('div', { class: 'field' }, h('label', { class: 'field__label', for: titleInput.id }, 'Название чек-листа в журнале'), titleInput),
    h('label', { class: 'field field--inline', for: prioInput.id }, prioInput, h('span', null, 'Приоритетный навык')),
    h('button', { type: 'submit', hidden: true }));

  const s = sheet({
    title: isNew ? 'Новый навык' : 'Изменить навык',
    content: form,
    actions: [
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => s.close() }, 'Отмена'),
      h('button', { class: 'btn btn--primary', type: 'button', onclick: save }, isNew ? 'Добавить' : 'Сохранить'),
    ],
  });

  function save() {
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); form.reportValidity(); return; }
    const rec = {
      name, icon: state.icon, color: state.color,
      minimum: minInput.value.trim(),
      checklistTitle: titleInput.value.trim() || 'Освоено',
      priority: prioInput.checked,
    };
    let saved;
    if (isNew) {
      const maxOrder = Math.max(0, ...all.map((x) => x.order ?? 0));
      const maxHint = Math.max(0, ...all.map((x) => x.hintOrder ?? 0));
      saved = store.put('skills', { id: store.uid('sk'), ...rec, order: maxOrder + 1, hintOrder: maxHint + 1 });
      toast(`Навык «${name}» добавлен`);
    } else {
      saved = store.patch('skills', skill.id, rec);
    }
    s.close();
    onDone?.(saved);
  }
  return s;
}

function nextColor(all) {
  const used = new Set(all.map((s) => s.color));
  return COLORS.find((c) => !used.has(c)) || ((all.length % 6) + 1);
}

export async function deleteSkill(skill) {
  const tasks = store.list('tasks', (t) => t.skillId === skill.id);
  const metrics = store.metrics(skill.id);
  const items = store.checklist(skill.id);
  const parts = [];
  if (tasks.length) parts.push(`${tasks.length} ${plural(tasks.length, ['задание', 'задания', 'заданий'])}`);
  if (metrics.length) parts.push(`${metrics.length} ${plural(metrics.length, ['показатель', 'показателя', 'показателей'])}`);
  if (items.length) parts.push(`${items.length} ${plural(items.length, ['пункт', 'пункта', 'пунктов'])} чек-листа`);
  const ok = await confirmDialog({
    title: `Удалить «${skill.name}»?`,
    text: parts.length
      ? `Вместе с навыком удалятся ${parts.join(', ')}. Это нельзя отменить.`
      : 'Навык исчезнет из плана и журнала. Это нельзя отменить.',
    okText: 'Удалить',
    danger: true,
  });
  if (!ok) return false;
  tasks.forEach((t) => store.remove('tasks', t.id));
  metrics.forEach((m) => store.remove('metrics', m.id));
  items.forEach((c) => store.remove('checklist', c.id));
  store.remove('skills', skill.id);
  toast(`Навык «${skill.name}» удалён`);
  return true;
}
