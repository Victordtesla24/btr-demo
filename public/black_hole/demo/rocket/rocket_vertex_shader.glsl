
uniform mat4 model_view_proj_matrix;

layout(location = 0) in vec3 position_attribute;
layout(location = 1) in vec3 normal_attribute;
layout(location = 2) in vec4 tangent_attribute;
layout(location = 3) in vec2 uv_attribute;
layout(location = 4) in float ambient_occlusion_attribute;

out vec3 position;
out vec3 normal;
out vec3 tangent;
out vec2 uv;
out float ambient_occlusion;

void main() {
  position = position_attribute;
  normal = normal_attribute;
  tangent = tangent_attribute.xyz;
  uv = uv_attribute;
  ambient_occlusion = ambient_occlusion_attribute;
  gl_Position = model_view_proj_matrix * vec4(position, 1.0);
}
