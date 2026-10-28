// Редактор показателей недельного журнала для одного навыка.

import * as store from '../store.js';
import { h, ico, sheet, toast, confirmDialog, formDialog } from '../ui.js';
import { moveInList } from './settings-skills.js';

export const METRIC_TYPES = [
  ['number', 'Число'],
  ['percent', 'Процент (0–100)'],
  ['scale', 'Шкала 1–5'],
  ['bool', 'Да / нет'],
  ['select', 'Выбор из списка'],
];
const typeLabel = (t) => (METRIC_TYPES.find(([v]) => v === t) || [t, t])[1];

// Форма показателя. Возвращает сохранённую запись или null.
export async function editMetric(skillId, metric) {
  let values = {
    label: metric?.label || '',
    type: metric?.type || 'number',
    unit: metric?.unit || '',
    options: (metric?.options || []).join('\n'),
    optional: !!metric?.optional,
    hint: metric?.hint || '',
    lowerIsBetter: !!metric?.lowerIsBetter,
  };
  for (;;) {
    const res = await formDialog({
      title: metric ? 'Изменить показатель' : 'Новый показатель',
      okText: metric ? 'Сохранить' : 'Добавить',
      fields: [
        { name: 'label', label: 'Название', type: 'text', value: values.label, required: true, autofocus: true,
          placeholder: 'Например, Длина шарфа' },
        { name: 'type', label: 'Тип', type: 'select', value: values.type, options: METRIC_TYPES },
        { name: 'unit', label: 'Единица (для числа)', type: 'text', value: values.unit, placeholder: 'см, мин, слов…' },
        { name: 'options', label: 'Варианты (для «Выбор из списка»)', type: 'textarea', value: values.options, rows: 4,
          hint: 'Каждый вариант — с новой строки.' },
        { name: 'optional', label: 'Необязательный показатель', type: 'checkbox', value: values.optional },
        { name: 'hint', label: 'Подсказка', type: 'text', value: values.hint, placeholder: 'Например, раз в 2 недели' },
        { name: 'lowerIsBetter', label: 'Меньше — лучше (например, время)', type: 'checkbox', value: values.lowerIsBetter },
      ],
    });
    if (!res) return null;
    values = res;
    const options = res.options.split('\n').map((x) => x.trim()).filter(Boolean);
    if (res.type === 'select' && options.length < 2) {
      toast('Для выбора из списка нужно хотя бы два варианта');
      continue;
    }
    const rec = {
      skillId,
      label: res.label,
      type: res.type,
      unit: res.type === 'percent' ? '%' : (res.type === 'number' ? res.unit : ''),
      options: res.type === 'select' ? options : null,
      optional: res.optional,
      hint: res.hint,
      lowerIsBetter: res.lowerIsBetter,
    };
    if (metric) return store.patch('metrics', metric.id, rec);
    const order = Math.max(0, ...store.metrics(skillId).map((m) => m.order ?? 0)) + 1;
    return store.put('metrics', { id: store.uid('m'), ...rec, order });
  }
}

// Панель со списком показателей навыка. onChange() — после каждой правки.
export function openMetricsEditor(skillId, { onChange } = {}) {
  const skill = store.skill(skillId);
  if (!skill) return null;
  const listEl = h('div', { class: 'list set-metrics' });
  const changed = () => { paint(); onChange?.(); };

  function paint() {
    const items = store.metrics(skillId);
    listEl.replaceChildren(
      ...(items.length ? items.map((m, i) => h('div', { class: 'list__item set-metric' },
        h('div', { class: 'set-metric__main' },
          h('div', { class: 'set-metric__label' }, m.label),
          h('div', { class: 'small muted' }, [typeLabel(m.type), m.unit && m.type === 'number' ? m.unit : null,
            m.optional ? 'необязательно' : null, m.lowerIsBetter ? 'меньше — лучше' : null].filter(Boolean).join(' · '))),
        h('div', { class: 'set-metric__actions' },
          h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Выше', disabled: i === 0,
            onclick: () => { if (moveInList('metrics', items, i, -1)) changed(); } }, ico('chevron-up')),
          h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Ниже', disabled: i === items.length - 1,
            onclick: () => { if (moveInList('metrics', items, i, 1)) changed(); } }, ico('chevron-down')),
          h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': `Изменить «${m.label}»`,
            onclick: async () => { if (await editMetric(skillId, m)) changed(); } }, ico('edit')),
          h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': `Удалить «${m.label}»`,
            onclick: async () => {
              const ok = await confirmDialog({ title: `Удалить «${m.label}»?`,
                text: 'Показатель пропадёт из журнала всех недель.', okText: 'Удалить', danger: true });
              if (ok) { store.remove('metrics', m.id); changed(); }
            } }, ico('trash')))))
        : [h('p', { class: 'muted small' }, 'Показателей пока нет. Добавьте то, что хочется отслеживать каждую неделю.')]));
  }
  paint();

  const s = sheet({
    title: `Показатели: ${skill.name}`,
    content: h('div', { class: 'stack' }, listEl),
    actions: [
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => s.close() }, 'Готово'),
      h('button', { class: 'btn btn--primary', type: 'button',
        onclick: async () => { if (await editMetric(skillId, null)) changed(); } }, ico('plus'), ' Добавить'),
    ],
  });
  return s;
}
