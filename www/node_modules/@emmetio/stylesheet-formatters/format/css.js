'use strict';

import render from '@emmetio/output-renderer';
import parseFields from '@emmetio/field-parser';

const defaultFormatOptions = {
	shortHex: true,
	between: ': ',
	after: ';'
};

/**
 * Renders given parsed Emmet CSS abbreviation as CSS-like
 * stylesheet, formatted according to `profile` options
 * @param  {Node}     tree    Parsed Emmet abbreviation
 * @param  {Profile}  profile Output profile
 * @param  {Object}  [options] Additional formatter options
 * @return {String}
 */
export default function css(tree, profile, options) {
	options = options || {};
	const formatOpt = Object.assign({}, defaultFormatOptions, options && options.format);

	return render(tree, options.field, outNode => {
		const node = outNode.node;
		let value = stringifyValue(node, formatOpt);

		if (node.attributes.length) {
			const fieldValues = node.attributes.map(attr => stringifyValue(attr, formatOpt));
			value = injectFields(value, fieldValues);
		}

		outNode.open = node.name && profile.name(node.name);
		outNode.afterOpen = formatOpt.between;
		outNode.text = outNode.renderFields(value || null);

		if (outNode.open && (!outNode.text || !outNode.text.endsWith(';'))) {
			outNode.afterText = formatOpt.after;
		}

		if (profile.get('format')) {
			outNode.newline = '\n';
			if (tree.lastChild !== node) {
				outNode.afterText += outNode.newline;
			}
		}

		return outNode;
	});
}

/**
 * Injects given field values at each field of given string
 * @param  {String}   string
 * @param  {String[]} attributes
 * @return {FieldString}
 */
function injectFields(string, values) {
	const fieldsModel = parseFields(string);
	const fieldsAmount = fieldsModel.fields.length;

	if (fieldsAmount) {
		values = values.slice();
		if (values.length > fieldsAmount) {
			// More values that output fields: collapse rest values into
			// a single token
			values = values.slice(0, fieldsAmount - 1)
				.concat(values.slice(fieldsAmount - 1).join(', '));
		}

		while (values.length) {
			const value = values.shift();
			const field = fieldsModel.fields.shift();
			const delta = value.length - field.length;

			fieldsModel.string = fieldsModel.string.slice(0, field.location)
				+ value
				+ fieldsModel.string.slice(field.location + field.length);

			// Update location of the rest fields in string
			for (let i = 0, il = fieldsModel.fields.length; i < il; i++) {
				fieldsModel.fields[i].location += delta;
			}
		}
	}

	return fieldsModel;
}

function stringifyValue(node, options) {
	if (node.value && typeof node.value === 'object' && node.value.type === 'css-value') {
		return node.value.value
		.map(token => {
			if (token && typeof token === 'object') {
				return token.type === 'color'
					? token.toString(options.shortHex)
					: token.toString();
			}

			return String(token);
		})
		.join(' ');
	}

	return node.value != null ? String(node.value) : '';
}
