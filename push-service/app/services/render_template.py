from jinja2 import Template


def render_template(template_str: str, context: dict) -> str:

    template = Template(template_str)

    return template.render(**context)

# template_str = "Hello {{ name }}, your order {{ order_id }} has been shipped!"
# context = {"name": "Uju", "order_id": 12345}
#
# rendered = render_template(template_str, context)
# print(rendered)