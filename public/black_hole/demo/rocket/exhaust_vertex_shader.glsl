
uniform mat4 model_view_proj_matrix;

layout(location = 0) in vec3 position_attribute;

out vec3 position;

void main() {
  position = position_attribute;
  gl_Position = model_view_proj_matrix * vec4(position, 1.0);
}
